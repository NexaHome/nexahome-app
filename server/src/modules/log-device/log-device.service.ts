import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { LogDevice } from '../../models/log.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { HomesService } from '../homes/homes.service';
import { CreateLogDeviceInput } from './dto/create-log-device.input';
import { DeviceNotFoundException, RoomNotFoundException } from '../../common/exceptions/app.exceptions';

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
    log.device_id = this.toIdString(device._id);
    log.value = input.value;
    log.createdAt = new Date();
    await log.save();

    return log;
  }

  async findByDevice(userId: string, homeId: string, deviceId: string) {
    await this.homesService.findOneByMember(homeId, userId);
    await this.findDeviceInHome(deviceId, homeId);

    return this.logModel.where('device_id', deviceId).get();
  }

  async findByHome(userId: string, homeId: string) {
    await this.homesService.findOneByMember(homeId, userId);

    const rooms = await this.roomModel.where('home_id', homeId).get();
    if (rooms.length === 0) {
      return [];
    }

    const roomIds = rooms.map((room) => this.toIdString(room._id)).filter((id) => id.length > 0);
    const devices = roomIds.length > 0 ? await this.deviceModel.whereIn('room_id', roomIds).get() : [];

    if (devices.length === 0) {
      return [];
    }

    const deviceIds = devices.map((device) => this.toIdString(device._id)).filter((id) => id.length > 0);

    return this.logModel.whereIn('device_id', deviceIds).get();
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
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null && 'toString' in value) {
      return String(value);
    }

    return '';
  }
}