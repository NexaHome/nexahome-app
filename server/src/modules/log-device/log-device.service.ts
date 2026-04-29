import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { LogDevice } from '../../models/log.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { HomesService } from '../homes/homes.service';
import { CreateLogDeviceInput } from './dto/create-log-device.input';
import { DeviceNotFoundException, RoomNotFoundException } from '../../common/exceptions/app.exceptions';
import { toIdString, toObjectId, toObjectIds } from '../../common/utils/object-id.util';
import { HomeUser } from '../../models/home-user.model';
import { User } from '../../models/user.model';
import { PushNotificationService } from '../push-notification/push-notification.service';

@Injectable()
export class LogDeviceService {
  constructor(
    @InjectModel(LogDevice) private readonly logModel: typeof LogDevice,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(Room) private readonly roomModel: typeof Room,
    @InjectModel(HomeUser) private readonly homeUserModel: typeof HomeUser,
    @Inject(forwardRef(() => HomesService))
    private readonly homesService: HomesService,
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async create(userId: string, homeId: string, input: CreateLogDeviceInput) {
    await this.homesService.findOneByMember(homeId, userId);
    const device = await this.findDeviceInHome(input.deviceId, homeId);

    const log = new this.logModel();
    log.device_id = toObjectId(this.toIdString(device._id));
    log.value = input.value;
    log.createdAt = new Date();
    await log.save();

    return log;
  }

  async createFromWebhook(antaresDeviceName: string, value: any) {
    if (!antaresDeviceName || antaresDeviceName === 'antares-cse') {
      return null;
    }

    // Get all devices and filter case-insensitively
    // This allows ONE physical hardware node to update multiple users' devices in the app
    const allDevices = await this.deviceModel.get();
    const matchedDevices = allDevices.filter(
      d => d.antares_device_name?.toLowerCase() === antaresDeviceName.toLowerCase()
    );

    if (matchedDevices.length === 0) {
      throw new DeviceNotFoundException();
    }

    const createdLogs: any[] = [];

    // Update ALL matching devices (for all users who added this sensor)
    for (const rawDevice of matchedDevices) {
      // Hydrate the model instance because .get() returns plain objects
      const device = await this.deviceModel.find(rawDevice._id);
      if (!device) continue;

      // Clone the value object so modifications don't leak across iterations
      const deviceValue = JSON.parse(JSON.stringify(value));

      // Auto-update device status if the payload contains a status field
      if (deviceValue && typeof deviceValue === 'object') {
        if (typeof deviceValue.status === 'string') {
          // Normalize status values for sensors
          const statusValue = deviceValue.status.toLowerCase();
          if (device.type === 'sensor' && statusValue === 'on') {
            device.status = 'Safe';
          } else {
            // Capitalize for consistency (e.g., 'danger' -> 'Danger')
            device.status = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
          }
        }

        // Format the numeric value based on the device category
        if (deviceValue.value !== undefined && !isNaN(Number(deviceValue.value))) {
          const rawValue = Number(deviceValue.value);
          let formattedValue = '';
          let unit = '';

          switch (device.category) {
            case 'light':
            case 'Light':
              unit = 'Lux';
              formattedValue = `${Math.round((rawValue / 4095) * 1000)} Lux`;
              break;
            case 'gas':
              unit = 'ppm';
              formattedValue = `${Math.round((rawValue / 4095) * 10000)} ppm`;
              break;
            case 'water':
              unit = 'cm';
              formattedValue = `${Math.round((rawValue / 4095) * 100)} cm`;
              break;
            case 'fire':
            case 'rain':
              unit = '%';
              formattedValue = `${Math.round((rawValue / 4095) * 100)} %`;
              break;
            default:
              formattedValue = String(rawValue);
          }

          deviceValue.formatted = formattedValue;
          deviceValue.unit = unit;
        }
      }
      
      device.last_value = deviceValue;
      device.updatedAt = new Date();
      await device.save();

      // --- LOGIKA ALERT BARU ---
      let shouldAlert = false;
      const statusText = deviceValue.status?.toLowerCase();
      const rawValue = Number(deviceValue.value);

      console.log(`[AlertCheck] Device: ${device.name}, Category: ${device.category}, Status: ${statusText}, Value: ${rawValue}`);

      // 1. Cek berdasarkan status teks (HANYA UNTUK BAHAYA/URGENT)
      const criticalKeywords = ['danger', 'urgent', 'emergency', 'critical', 'fire', 'smoke'];
      if (statusText && criticalKeywords.some(keyword => statusText.includes(keyword))) {
        console.log(`[AlertCheck] Triggered by CRITICAL Status: ${statusText}`);
        shouldAlert = true;
      }

      // 2. Cek berdasarkan ambang batas nilai (HANYA UNTUK LEVEL BAHAYA)
      if (device.type === 'sensor' && !isNaN(rawValue)) {
        switch (device.category?.toLowerCase()) {
          case 'gas':
            if (rawValue > 2500) { // Dinaikkan ke 2500 agar benar-benar bahaya
                console.log(`[AlertCheck] Triggered by CRITICAL Gas: ${rawValue}`);
                shouldAlert = true;
            }
            break;
          case 'water':
            if (rawValue > 4000) { // Dinaikkan ke 4000
                console.log(`[AlertCheck] Triggered by CRITICAL Water: ${rawValue}`);
                shouldAlert = true;
            }
            break;
          case 'fire':
            // Jika digital, 0 = Danger, 1 = Safe. Jika analog, nilai kecil = Danger.
            if (rawValue === 0 || (rawValue > 1 && rawValue < 100)) { 
                console.log(`[AlertCheck] Triggered by CRITICAL Fire: ${rawValue}`);
                shouldAlert = true;
            }
            break;
          case 'rain':
            // Jika digital, 0 = Heavy Rain, 1 = Clear. Jika analog, nilai kecil = Hujan lebat.
            if (rawValue === 0 || (rawValue > 1 && rawValue < 100)) { 
                console.log(`[AlertCheck] Triggered by Heavy Rain: ${rawValue}`);
                shouldAlert = true;
            }
            break;
        }
      }

      if (shouldAlert) {
        // --- LOGIKA ANTI-SPAM (COOLDOWN 1 MENIT) ---
        const now = new Date();
        const lastAlertAt = device['last_alert_at'] ? new Date(device['last_alert_at']) : null;
        const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000); // Diubah ke 1 menit

        if (!lastAlertAt || lastAlertAt < oneMinuteAgo) {
          console.log(`[AlertCheck] Cooldown passed. Sending push alert for ${device.name}...`);
          
          // Update waktu alert terakhir agar tidak spam
          device['last_alert_at'] = now;
          await device.save();

          await this.sendPushAlert(device, deviceValue);
        } else {
          const remainingSec = Math.round((lastAlertAt.getTime() + 1 * 60 * 1000 - now.getTime()) / 1000);
          console.log(`[AlertCheck] Cooldown active for ${device.name}. Skip notify. (${remainingSec}s left)`);
        }
      } else {
        // Jika kondisi sudah aman, reset waktu alert terakhir
        if (device['last_alert_at']) {
            console.log(`[AlertCheck] Device ${device.name} is safe. Resetting cooldown.`);
            device['last_alert_at'] = null;
            await device.save();
        }
      }
      // -----------------------------------------

      const log = new this.logModel();
      log.device_id = toObjectId(this.toIdString(device._id));
      log.value = deviceValue;
      log.createdAt = new Date();
      await log.save(); // Simpan ke MongoDB
      createdLogs.push(log);
    }

    return createdLogs;
  }


  async findByDevice(userId: string, homeId: string, deviceId: string) {
    await this.homesService.findOneByMember(homeId, userId);
    await this.findDeviceInHome(deviceId, homeId);

    return this.logModel.where('device_id', toObjectId(deviceId)).get();
  }

  async findByHome(userId: string, homeId: string) {
    await this.homesService.findOneByMember(homeId, userId);

    const rooms = await this.roomModel.where('home_id', toObjectId(homeId)).get();
    if (rooms.length === 0) {
      return [];
    }

    const roomIds = rooms.map((room) => this.toIdString(room._id)).filter((id) => id.length > 0);
    const devices = roomIds.length > 0 ? await this.deviceModel.whereIn('room_id', toObjectIds(roomIds)).get() : [];

    if (devices.length === 0) {
      return [];
    }

    const deviceIds = devices.map((device) => this.toIdString(device._id)).filter((id) => id.length > 0);

    return this.logModel.whereIn('device_id', toObjectIds(deviceIds)).orderBy('createdAt', 'desc').limit(50).get();
  }

  async findAlertsByHome(userId: string, homeId: string, limit: number = 50) {
    await this.homesService.findOneByMember(homeId, userId);

    const rooms = await this.roomModel.where('home_id', toObjectId(homeId)).get();
    if (rooms.length === 0) return [];

    const roomIds = rooms.map(r => this.toIdString(r._id)).filter(id => id.length > 0);
    const devices = await this.deviceModel.whereIn('room_id', toObjectIds(roomIds)).get();
    if (devices.length === 0) return [];

    const deviceIds = devices.map(d => this.toIdString(d._id)).filter(id => id.length > 0);

    // Filter for statuses that ARE NOT safe/normal/clear
    // This assumes the value is stored as an object or JSON in MongoDB
    return this.logModel
      .whereIn('device_id', toObjectIds(deviceIds))
      .whereNotIn('value.status', ['safe', 'normal', 'clear', 'Safe', 'Normal', 'Clear'])
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
  }

  private async findDeviceInHome(deviceId: string, homeId: string) {
    if (!deviceId || !this.isValidObjectId(deviceId)) {
      throw new DeviceNotFoundException();
    }
    const device = await this.deviceModel.find(deviceId);
    if (!device) {
      throw new DeviceNotFoundException();
    }

    const room = await this.roomModel.find(this.toIdString(device.room_id));
    if (!room || this.toIdString(room.home_id) !== homeId) {
      throw new RoomNotFoundException();
    }

    return device;
  }

  private isValidObjectId(id: string) {
    return id && /^[0-9a-fA-F]{24}$/.test(id);
  }

  private toIdString(value: unknown) {
    return toIdString(value);
  }

  private async sendPushAlert(device: Device, deviceValue: any) {
    try {
      console.log(`[PushService] Getting room for device: ${device.name} (${device.room_id})`);
      const room = await this.roomModel.find(this.toIdString(device.room_id));
      if (!room) {
        console.log(`[PushService] Room not found for device ${device.name}`);
        return;
      }

      console.log(`[PushService] Finding members for Home: ${room.home_id}`);
      const members = await this.homeUserModel
        .where('home_id', toObjectId(this.toIdString(room.home_id)))
        .with('user')
        .get();

      console.log(`[PushService] Found ${members.length} members in this home.`);

      const pushTokens: string[] = [];
      for (const member of members) {
        let user = (member as any).user;
        
        // Jika relasi otomatis gagal, ambil manual lewat userModel
        if (!user) {
          const userId = (member as any).user_id;
          console.log(`[PushService] Relationship failed, fetching user manually: ${userId}`);
          user = await this.userModel.find(this.toIdString(userId));
        }

        if (user && user.pushTokens && user.pushTokens.length > 0) {
          console.log(`[PushService] Found ${user.pushTokens.length} tokens for user ${user.name}`);
          pushTokens.push(...user.pushTokens);
        } else {
          console.log(`[PushService] Member ${user?.name || 'Unknown'} has no tokens.`);
        }
      }

      console.log(`[PushService] Total tokens to notify: ${pushTokens.length}`);

      if (pushTokens.length > 0) {
        let title = `🚨 NEXAHOME ALERT: ${device.category?.toUpperCase() || 'SENSOR'}`;
        let body = `${device.name} di ${room.name} mendeteksi kondisi berbahaya!`;

        // Custom messages based on category
        switch (device.category?.toLowerCase()) {
          case 'gas':
            body = `⚠️ BAHAYA GAS! Kebocoran gas terdeteksi di ${room.name}. Segera periksa dan buka jendela! (${deviceValue.formatted || deviceValue.value})`;
            break;
          case 'water':
            body = `🌊 WASPADA BANJIR! Genangan air terdeteksi di ${room.name}. Mohon segera cek lokasi. (${deviceValue.formatted || deviceValue.value})`;
            break;
          case 'fire':
            body = `🔥 EMERGENCY: API TERDETEKSI! Sensor api di ${room.name} aktif. Segera evakuasi atau cek sumber api!`;
            break;
          case 'rain':
            body = `🌧️ HUJAN TURUN! Jemuran atau area terbuka di ${room.name} mungkin perlu diamankan.`;
            break;
          default:
            body = `${device.name} di ${room.name} berstatus ${deviceValue.status}. (${deviceValue.formatted || deviceValue.value})`;
        }
        
        console.log(`[PushService] Sending to Expo... Title: ${title}`);
        await this.pushNotificationService.sendNotification(
          pushTokens,
          title,
          body,
          { 
            deviceId: this.toIdString(device._id), 
            homeId: this.toIdString(room.home_id),
            type: 'sensor_alert'
          }
        );
      }
    } catch (error) {
      console.error('[PushService] Error:', error);
    }
  }
}
