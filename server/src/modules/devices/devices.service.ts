import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { LogDevice } from '../../models/log.model';
import { HomesService } from '../homes/homes.service';
import { CreateDeviceInput } from './dto/create-device.input';
import { UpdateDeviceInput } from './dto/update-device.input';
import { DeviceNotFoundException, RoomNotFoundException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(Room) private readonly roomModel: typeof Room,
    @InjectModel(DeviceAutomation) private readonly deviceAutomationModel: typeof DeviceAutomation,
    @InjectModel(LogDevice) private readonly logModel: typeof LogDevice,
    private readonly homesService: HomesService,
  ) {}

  async create(userId: string, homeId: string, roomId: string, createDeviceInput: CreateDeviceInput) {
    await this.homesService.findOneByMember(homeId, userId);

    const room = await this.findRoomByHome(roomId, homeId);

    const device = new this.deviceModel();
    device.room_id = this.toIdString(room._id);
    device.name = createDeviceInput.name;
    device.type = createDeviceInput.type;
    device.status = createDeviceInput.status ?? 'OFF';
    device.createdAt = new Date();
    await device.save();

    return device;
  }

  async findAllByRoom(userId: string, homeId: string, roomId: string) {
    await this.homesService.findOneByMember(homeId, userId);
    await this.findRoomByHome(roomId, homeId);

    return this.deviceModel.where('room_id', roomId).get();
  }

  async findOneByMember(userId: string, homeId: string, roomId: string, id: string) {
    await this.homesService.findOneByMember(homeId, userId);

    const device = await this.deviceModel.find(id);
    if (!device) {
      throw new DeviceNotFoundException();
    }

    await this.findRoomByHome(this.toIdString(device.room_id), homeId);

    if (roomId && this.toIdString(device.room_id) !== roomId) {
      throw new DeviceNotFoundException();
    }

    return device;
  }

  async update(userId: string, homeId: string, roomId: string, id: string, updateDeviceInput: UpdateDeviceInput) {
    const device = await this.findOneByMember(userId, homeId, roomId, id);

    const updatePayload: Record<string, string> = {};

    if (typeof updateDeviceInput.name !== 'undefined') {
      updatePayload.name = updateDeviceInput.name;
    }

    if (typeof updateDeviceInput.type !== 'undefined') {
      updatePayload.type = updateDeviceInput.type;
    }

    if (typeof updateDeviceInput.status !== 'undefined') {
      updatePayload.status = updateDeviceInput.status;
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.deviceModel.where('_id', id).update(updatePayload);
    }

    return this.findOneByMember(userId, homeId, roomId, this.toIdString(device._id));
  }

  async remove(userId: string, homeId: string, roomId: string, id: string) {
    await this.findOneByMember(userId, homeId, roomId, id);

    await this.logModel.where('device_id', id).delete();
    await this.deviceAutomationModel.where('device_id', id).delete();

    const deletedCount = await this.deviceModel.destroy(id);

    return deletedCount > 0;
  }

  private async findRoomByHome(roomId: string, homeId: string) {
    const room = await this.roomModel.find(roomId);
    if (!room || this.toIdString(room.home_id) !== homeId) {
      throw new RoomNotFoundException();
    }

    return room;
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