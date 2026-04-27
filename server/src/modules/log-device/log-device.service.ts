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

  async createFromWebhook(deviceId: string, value: any) {
    if (!deviceId || !this.isValidObjectId(deviceId)) {
      throw new DeviceNotFoundException();
    }
    const device = await this.deviceModel.find(deviceId);
    if (!device) {
      throw new DeviceNotFoundException();
    }

    // Auto-update device status if the payload contains a status field
    if (value && typeof value === 'object') {
      if (typeof value.status === 'string') {
        // Capitalize the first letter for consistency (e.g., 'danger' -> 'Danger', 'on' -> 'On')
        const statusValue = value.status;
        device.status = statusValue.charAt(0).toUpperCase() + statusValue.slice(1).toLowerCase();
      }

      // Format the numeric value based on the device category
      if (value.value !== undefined && !isNaN(Number(value.value))) {
        const rawValue = Number(value.value);
        let formattedValue = '';
        let unit = '';

        switch (device.category) {
          case 'light':
            unit = 'Lux';
            // Mockup lux calculation (0-4095 scaled to 0-1000 Lux)
            formattedValue = `${Math.round((rawValue / 4095) * 1000)} Lux`;
            break;
          case 'gas':
            unit = 'ppm';
            // Mockup PPM calculation (0-4095 scaled to 0-10000 ppm)
            formattedValue = `${Math.round((rawValue / 4095) * 10000)} ppm`;
            break;
          case 'water':
            unit = 'cm';
            // Mockup water level (0-4095 scaled to 0-100 cm)
            formattedValue = `${Math.round((rawValue / 4095) * 100)} cm`;
            break;
          case 'fire':
          case 'rain':
            unit = '%';
            // Convert to simple percentage 0-100%
            formattedValue = `${Math.round((rawValue / 4095) * 100)} %`;
            break;
          default:
            formattedValue = String(rawValue);
        }

        value.formatted = formattedValue;
        value.unit = unit;
      }
    }
    
    device.last_value = value;
    
    await device.save();

    const log = new this.logModel();
    log.device_id = toObjectId(this.toIdString(device._id));
    log.value = value;
    log.createdAt = new Date();
    await log.save();

    return log;
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

    return this.logModel.whereIn('device_id', toObjectIds(deviceIds)).get();
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
