import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { LogDevice } from '../../models/log.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { HomesService } from '../homes/homes.service';
import { CreateLogDeviceInput } from './dto/create-log-device.input';
import {
  DeviceNotFoundException,
  RoomNotFoundException,
} from '../../common/exceptions/app.exceptions';
import {
  toIdString,
  toObjectId,
  toObjectIds,
} from '../../common/utils/object-id.util';
import { HomeUser } from '../../models/home-user.model';
import { User } from '../../models/user.model';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { ModuleRef } from '@nestjs/core';
import { Automation } from '../../models/automation.model';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class LogDeviceService implements OnModuleInit {
  constructor(
    @InjectModel(LogDevice) private readonly logModel: typeof LogDevice,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(Room) private readonly roomModel: typeof Room,
    @InjectModel(HomeUser) private readonly homeUserModel: typeof HomeUser,
    @Inject(forwardRef(() => HomesService))
    private readonly homesService: HomesService,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Automation) private readonly automationModel: typeof Automation,
    private readonly pushNotificationService: PushNotificationService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    // Jalankan pembersihan log lama saat server dinyalakan
    await this.cleanupOldLogs();
  }

  async create(userId: string, homeId: string, input: CreateLogDeviceInput) {
    await this.homesService.findOneByMember(homeId, userId);
    await this.findDeviceInHome(input.deviceId, homeId);

    const log = new this.logModel();
    log.device_id = toObjectId(input.deviceId);
    log.value = input.value;
    log.createdAt = new Date();
    await log.save();

    return log;
  }

  async createFromWebhook(antaresDeviceName: string, deviceValue: any) {
    try {
      const allDevices = (await this.deviceModel.get()) as any[];
      const matchedDevices = allDevices.filter((d) => {
        const db = (d.antares_device_name || '').toLowerCase().trim().replace(/\s/g, '');
        const inc = antaresDeviceName.toLowerCase().trim().replace(/\s/g, '');
        
        if (db === inc) return true;
        
        if ((inc === 'light' && db === 'lightsensor') || (inc === 'lightsensor' && db === 'light')) {
          return true;
        }
        
        return false;
      });

      if (matchedDevices.length === 0) {
        console.log(`[Webhook] No device matched name: ${antaresDeviceName}`);
        return [];
      }

      const createdLogs: LogDevice[] = [];
      const statusValue = deviceValue.status?.toLowerCase();

      for (const device of matchedDevices) {
        // 1. Tentukan apakah ini data sensor asli atau perintah kontrol
        const isCommand = !!deviceValue.target;
        
        const updatePayload: any = {
            updatedAt: new Date()
        };

        // 2. Update Status (Berlaku untuk dua-duanya)
        if (statusValue) {
          if (statusValue === 'safe' || statusValue === 'normal' || statusValue === 'clear') {
            updatePayload.status = 'Safe';
          } else if (statusValue === 'bright' || statusValue === 'dark') {
            const isLamp = device.name.toLowerCase().includes('lampu') || device.category?.toLowerCase() === 'lamp';
            const isIndicator = device.name.toLowerCase().includes('indicator') || device.name.toLowerCase().includes('switch');
            
            if (isLamp && deviceValue.lamp) {
              updatePayload.status = deviceValue.lamp.charAt(0).toUpperCase() + deviceValue.lamp.slice(1);
            } else if (isIndicator && deviceValue.indicator) {
              updatePayload.status = deviceValue.indicator.charAt(0).toUpperCase() + deviceValue.indicator.slice(1);
            } else {
              updatePayload.status = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
            }
          } else {
            updatePayload.status = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
          }
        }

        // 3. Hanya update last_value (Lux/Nilai) jika ini BUKAN perintah kontrol
        if (!isCommand) {
          updatePayload.last_value = deviceValue;
          
          if (deviceValue.value !== undefined && !isNaN(Number(deviceValue.value))) {
            const rawValue = Number(deviceValue.value);
            let formattedValue = '';
            let unit = '';

            switch (device.category?.toLowerCase()) {
              case 'lux':
              case 'light': {
                let luxValue = 0;
                if (rawValue > 0 && rawValue < 4095) {
                  const resistance = (10000 * rawValue) / (4095 - rawValue);
                  luxValue = Math.round(500 / Math.pow(resistance / 1000, 1.4));
                } else if (rawValue >= 4095) luxValue = 0;
                else luxValue = 10000;
                
                if (luxValue > 10000) luxValue = 10000;
                formattedValue = `${luxValue} lux`;
                unit = 'lux';
                deviceValue.value = luxValue;
                break;
              }
              case 'temp':
              case 'temperature':
                formattedValue = `${rawValue}°C`;
                unit = '°C';
                break;
              case 'humid':
              case 'humidity':
                formattedValue = `${rawValue}%`;
                unit = '%';
                break;
              default:
                formattedValue = String(rawValue);
            }

            deviceValue.formatted = formattedValue;
            deviceValue.unit = unit;
            updatePayload.last_value = deviceValue;
          }
        }

        // 4. Simpan ke database (Update Perangkat Gaya Eloquent)
        const deviceToUpdate = await this.deviceModel.find(device._id);
        if (deviceToUpdate) {
          console.log(`[DEBUG UPDATE] Saving device ${deviceToUpdate.name} with Lux:`, deviceValue.formatted);
          deviceToUpdate.status = updatePayload.status;
          if (!isCommand) {
             deviceToUpdate.last_value = updatePayload.last_value;
          }
          deviceToUpdate.updatedAt = new Date();
          await deviceToUpdate.save();
        }

        // 5. Simpan LOG baru (History) jika ini bukan perintah kontrol
        if (!isCommand && deviceValue.value !== undefined) {
          const newLog = new this.logModel();
          newLog.device_id = device._id;
          newLog.value = String(deviceValue.value);
          newLog.formatted = deviceValue.formatted;
          newLog.createdAt = new Date();
          await newLog.save();
          createdLogs.push(newLog);
        }

        let shouldAlert = false;
        const statusText = deviceValue.status?.toLowerCase();
        const rawValue = Number(deviceValue.value);

        console.log(
          `[AlertCheck] Device: ${device.name}, Category: ${device.category}, Status: ${statusText}, Value: ${rawValue}`,
        );

        const criticalKeywords = [
          'danger',
          'urgent',
          'emergency',
          'critical',
          'fire',
          'smoke',
          'heavy',
        ];
        if (
          statusText &&
          criticalKeywords.some((keyword) => statusText.includes(keyword))
        ) {
          shouldAlert = true;
        }

        if (device.type === 'sensor' && !isNaN(rawValue)) {
          switch (device.category?.toLowerCase()) {
            case 'gas':
              if (rawValue > 2500) shouldAlert = true;
              break;
            case 'water':
              if (rawValue > 4000) shouldAlert = true;
              break;
            case 'fire':
            case 'rain':
              if (rawValue === 0 || (rawValue > 1 && rawValue < 100)) shouldAlert = true;
              break;
          }
        }

        if (shouldAlert) {
          const now = new Date();
          const lastAlertAt = device.last_alert_at ? new Date(device.last_alert_at) : null;
          const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);

          if (!lastAlertAt || lastAlertAt < oneMinuteAgo) {
            await this.deviceModel.where('_id', device._id).update({ last_alert_at: now });
            await this.sendPushAlert(device as any, deviceValue);
          }
        } else if (device.last_alert_at) {
            await this.deviceModel.where('_id', device._id).update({ last_alert_at: null });
        }

        await this.checkSensorAutomations(device as any, rawValue);

        const log = new this.logModel();
        log.device_id = toObjectId(device._id);
        log.value = deviceValue;
        log.createdAt = new Date();
        await log.save();
        createdLogs.push(log);
      }

      return createdLogs;
    } catch (error) {
      console.error('[Webhook] Error processing Antares data:', error);
      return [];
    }
  }

  async findAll() {
    return this.logModel.orderBy('createdAt', 'desc').limit(100).get();
  }

  async findByDevice(userId: string, homeId: string, deviceId: string) {
    await this.homesService.findOneByMember(homeId, userId);
    await this.findDeviceInHome(deviceId, homeId);

    return this.logModel
      .where('device_id', toObjectId(deviceId))
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
  }

  async findByHome(userId: string, homeId: string) {
    await this.homesService.findOneByMember(homeId, userId);

    const rooms = await this.roomModel
      .where('home_id', toObjectId(homeId))
      .get();
    if (rooms.length === 0) {
      return [];
    }

    const roomIds = rooms
      .map((room) => this.toIdString(room._id))
      .filter((id) => id.length > 0);
    const devices =
      roomIds.length > 0
        ? await this.deviceModel.whereIn('room_id', toObjectIds(roomIds)).get()
        : [];

    if (devices.length === 0) {
      return [];
    }

    const deviceIds = devices
      .map((device) => this.toIdString(device._id))
      .filter((id) => id.length > 0);

    return this.logModel
      .whereIn('device_id', toObjectIds(deviceIds))
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
  }

  async findAlertsByHome(userId: string, homeId: string, limit: number = 50) {
    await this.homesService.findOneByMember(homeId, userId);

    const rooms = await this.roomModel
      .where('home_id', toObjectId(homeId))
      .get();
    if (rooms.length === 0) return [];

    const roomIds = rooms
      .map((r) => this.toIdString(r._id))
      .filter((id) => id.length > 0);
    const devices = await this.deviceModel
      .whereIn('room_id', toObjectIds(roomIds))
      .get();
    if (devices.length === 0) return [];

    const deviceIds = devices
      .map((d) => this.toIdString(d._id))
      .filter((id) => id.length > 0);

    return this.logModel
      .whereIn('device_id', toObjectIds(deviceIds))
      .whereNotIn('value.status', [
        'safe',
        'normal',
        'clear',
        'Safe',
        'Normal',
        'Clear',
        'bright',
        'dark',
        'Bright',
        'Dark',
        'low',
        'Low',
      ])
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
  }

  private toIdString(value: unknown) {
    return toIdString(value);
  }

  private async checkSensorAutomations(device: Device, rawValue: number) {
    try {
      const deviceId = this.toIdString(device._id);
      
      const allAutomations = await this.automationModel.where('is_active', true).get();
      
      for (const automation of allAutomations) {
        let trigger: any = {};
        try {
          trigger = JSON.parse(automation.trigger);
        } catch (e) { continue; }

        if (trigger.type !== 'sensor' || trigger.sensorId !== deviceId) {
          continue;
        }

        const threshold = trigger.value;
        const operator = trigger.operator;
        let matched = false;

        if (operator === 'gt' && rawValue > threshold) matched = true;
        else if (operator === 'lt' && rawValue < threshold) matched = true;
        else if (operator === 'eq' && Math.abs(rawValue - threshold) < 1) matched = true;

        if (matched) {
          const now = new Date();
          const lastExec = automation.lastExecutedAt ? new Date(automation.lastExecutedAt) : null;
          const thirtySecAgo = new Date(now.getTime() - 30 * 1000);

          if (!lastExec || lastExec < thirtySecAgo) {
            console.log(`[SensorAutomation] Triggering ${automation.name} for sensor ${device.name} (Value: ${rawValue} ${operator} ${threshold})`);
            
            try {
                const automationQueueModule = await import('../automations/automation-queue.service.js');
                const automationQueueService = this.moduleRef.get(automationQueueModule.AutomationQueueService, { strict: false });
                await automationQueueService.enqueueAutomation(this.toIdString(automation._id));
            } catch (queueErr) {
                console.error('[SensorAutomation] Failed to get AutomationQueueService:', queueErr);
            }
          }
        }
      }
    } catch (error) {
      console.error('[SensorAutomation] Error:', error);
    }
  }

  private async sendPushAlert(device: Device, deviceValue: any) {
    try {
      const room = await this.roomModel.find(this.toIdString(device.room_id));
      if (!room) return;

      const homeId = this.toIdString(room.home_id);
      const members = await this.homeUserModel
        .where('home_id', toObjectId(homeId))
        .with('user')
        .get();

      const pushTokens: string[] = [];
      for (const member of members) {
        let user = member['user'] as User;
        if (!user) {
          const userId = (member as any).user_id;
          user = await this.userModel.find(this.toIdString(userId));
        }
        if (user && user.pushTokens && user.pushTokens.length > 0) {
          pushTokens.push(...user.pushTokens);
        }
      }

      if (pushTokens.length > 0) {
        const title = `⚠️ Bahaya: ${device.name}`;
        let body = `${device.name} di ${room.name} mendeteksi kondisi kritis! (${deviceValue.formatted || deviceValue.value})`;

        switch (device.category?.toLowerCase()) {
          case 'gas':
            body = `🔥 Kebocoran Gas terdeteksi di ${room.name}! Segera cek lokasi. (${deviceValue.formatted})`;
            break;
          case 'fire':
            body = `🚒 Api/Asap terdeteksi di ${room.name}! Segera evakuasi!`;
            break;
          case 'water':
            body = `💧 Kebocoran Air terdeteksi di ${room.name}! (${deviceValue.formatted})`;
            break;
          case 'rain':
            body = `🌧️ Hujan deras terdeteksi! (${deviceValue.formatted})`;
            break;
          default:
            body = `${device.name} di ${room.name} berstatus ${deviceValue.status}. (${deviceValue.formatted || deviceValue.value})`;
        }

        await this.pushNotificationService.sendNotification(
          pushTokens,
          title,
          body,
          {
            deviceId: this.toIdString(device._id),
            homeId: this.toIdString(room.home_id),
            type: 'sensor_alert',
          },
        );
      }
    } catch (error) {
      console.error('[PushService] Error:', error);
    }
  }

  /**
   * Menghapus log perangkat yang lebih lama dari 7 hari
   */
  async cleanupOldLogs(days: number = 7) {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - days);
      
      const result = await this.logModel.where('createdAt', '<', expirationDate).delete();
      if (result > 0) {
        console.log(`[Cleanup] Successfully removed ${result} old logs (older than ${days} days).`);
      }
    } catch (error) {
      console.error('[Cleanup] Error removing old logs:', error);
    }
  }

  private async findDeviceInHome(deviceId: string, homeId: string) {
    const device = await this.deviceModel.find(deviceId);
    if (!device) throw new DeviceNotFoundException();

    const room = await this.roomModel.find(this.toIdString(device.room_id));
    if (!room || this.toIdString(room.home_id) !== homeId) {
      throw new DeviceNotFoundException();
    }
    return device;
  }
}
