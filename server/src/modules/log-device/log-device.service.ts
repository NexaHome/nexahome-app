import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { LogDevice } from '../../models/log.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { HomesService } from '../homes/homes.service';
import { CreateLogDeviceInput } from './dto/create-log-device.input';
import { DeviceNotFoundException, RoomNotFoundException } from '../../common/exceptions/app.exceptions';
import { toIdString, toObjectId, toObjectIds } from '../../common/utils/object-id.util';

@Injectable()
export class LogDeviceService {
  constructor(
    @InjectModel(LogDevice) private readonly logModel: typeof LogDevice,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(Room) private readonly roomModel: typeof Room,
    private readonly homesService: HomesService,
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
    if (!antaresDeviceName) {
      throw new DeviceNotFoundException();
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
          // Capitalize the first letter for consistency (e.g., 'danger' -> 'Danger', 'on' -> 'On')
          const statusValue = deviceValue.status;
          device.status = statusValue.charAt(0).toUpperCase() + statusValue.slice(1).toLowerCase();
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

      const log = new this.logModel();
      log.device_id = toObjectId(this.toIdString(device._id));
      log.value = deviceValue;
      log.createdAt = new Date();
      await log.save();
      
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
}
