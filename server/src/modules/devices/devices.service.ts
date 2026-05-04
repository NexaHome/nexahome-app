import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { LogDevice } from '../../models/log.model';
import { HomesService } from '../homes/homes.service';
import { CreateDeviceInput } from './dto/create-device.input';
import { UpdateDeviceInput } from './dto/update-device.input';
import {
  DeviceNotFoundException,
  RoomNotFoundException,
} from '../../common/exceptions/app.exceptions';
import {
  toIdString,
  toObjectId,
  toObjectIds,
} from '../../common/utils/object-id.util';
import { AntaresService } from '../antares/antares.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(Room) private readonly roomModel: typeof Room,
    @InjectModel(DeviceAutomation)
    private readonly deviceAutomationModel: typeof DeviceAutomation,
    @InjectModel(LogDevice) private readonly logModel: typeof LogDevice,
    private readonly homesService: HomesService,
    private readonly antaresService: AntaresService,
  ) {}

  async create(
    userId: string,
    homeId: string,
    roomId: string,
    createDeviceInput: CreateDeviceInput,
  ) {
    await this.homesService.findOneByMember(homeId, userId);

    const room = await this.findRoomByHome(roomId, homeId);

    const device = new this.deviceModel();
    device.room_id = toObjectId(this.toIdString(room._id));
    device.name = createDeviceInput.name;
    device.type = createDeviceInput.type;
    device.status = createDeviceInput.status ?? 'OFF';
    device.category = createDeviceInput.category;
    
    // Auto-mapping: Samakan dengan firmware jika antares_device_name kosong atau berdasarkan kategori
    let antaresName = createDeviceInput.antares_device_name;
    if (!antaresName || antaresName.trim() === '') {
      const cat = (createDeviceInput.category || '').toLowerCase();
      if (cat === 'light' || cat === 'lux') antaresName = 'Light';
      else if (cat === 'fire') antaresName = 'Fire';
      else if (cat === 'rain') antaresName = 'Rain';
      else if (cat === 'gas') antaresName = 'gas';
      else if (cat === 'water') antaresName = 'water';
      else if (createDeviceInput.type === 'actuator') antaresName = 'Control';
      else antaresName = createDeviceInput.name; // Fallback ke nama perangkat
    }
    
    device.antares_device_name = antaresName;
    device.createdAt = new Date();
    await device.save();

    return device;
  }

  async findAllByRoom(userId: string, homeId: string, roomId: string) {
    await this.homesService.findOneByMember(homeId, userId);
    await this.findRoomByHome(roomId, homeId);

    return this.deviceModel.where('room_id', toObjectId(roomId)).get();
  }

  async findAllByHome(userId: string, homeId: string) {
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

    // Instead of whereIn which might have bugs with ObjectIds, fetch all and filter
    const allDevices = await this.deviceModel.get();
    return allDevices.filter((d) =>
      roomIds.includes(this.toIdString(d.room_id)),
    );
  }

  async findAll() {
    return this.deviceModel.get();
  }

  async findOneByMember(
    userId: string,
    homeId: string,
    roomId: string,
    id: string,
  ) {
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

  async update(
    userId: string,
    homeId: string,
    roomId: string,
    id: string,
    updateDeviceInput: UpdateDeviceInput,
  ) {
    const device = await this.findOneByMember(userId, homeId, roomId, id);

    if (updateDeviceInput.name !== undefined)
      device.name = updateDeviceInput.name;
    if (updateDeviceInput.type !== undefined)
      device.type = updateDeviceInput.type;
    if (updateDeviceInput.status !== undefined)
      device.status = updateDeviceInput.status;
    if (updateDeviceInput.is_active !== undefined)
      device.is_active = updateDeviceInput.is_active;
    if (updateDeviceInput.category !== undefined)
      device.category = updateDeviceInput.category;
    if (updateDeviceInput.antares_device_name !== undefined)
      device.antares_device_name = updateDeviceInput.antares_device_name;
    if (updateDeviceInput.room_id !== undefined) {
      // Validate that the new room belongs to the same home
      await this.findRoomByHome(updateDeviceInput.room_id, homeId);
      device.room_id = toObjectId(updateDeviceInput.room_id);
    }

    device.updatedAt = new Date();
    await device.save();

    // Trigger Antares if status or is_active changed
    if (
      (updateDeviceInput.status !== undefined ||
        updateDeviceInput.is_active !== undefined) &&
      device.antares_device_name
    ) {
      const isON =
        updateDeviceInput.is_active ?? updateDeviceInput.status === 'ON';
      const payload = this.getCommandPayload(
        device.category,
        isON ? 'ON' : 'OFF',
      );
      try {
        await this.antaresService.sendData(
          payload,
          undefined,
          device.antares_device_name || device.name,
        );
      } catch (err) {}
    }

    return this.findOneByMember(
      userId,
      homeId,
      roomId,
      this.toIdString(device._id),
    );
  }

  private getCommandPayload(category: string | undefined, status: string) {
    const cat = (category || '').toLowerCase();
    const isON = status.toUpperCase() === 'ON';

    if (cat === 'light' || cat === 'lamp') {
      return { lamp: isON ? 'on' : 'off', status: isON ? 'on' : 'off' };
    }

    if (cat === 'rain') {
      return { status: isON ? 'on' : 'off', servo: 'auto' };
    }

    return { status: status.toLowerCase() };
  }

  async assignToRoom(
    userId: string,
    homeId: string,
    deviceId: string,
    newRoomId: string,
  ) {
    await this.homesService.findOneByMember(homeId, userId);

    const device = await this.deviceModel.find(deviceId);
    if (!device) {
      throw new DeviceNotFoundException();
    }

    // Verify the device's current room is in this home
    await this.findRoomByHome(this.toIdString(device.room_id), homeId);

    // Verify the new room is in this home
    await this.findRoomByHome(newRoomId, homeId);

    device.room_id = toObjectId(newRoomId);
    device.updatedAt = new Date();
    await device.save();

    return device;
  }

  async remove(userId: string, homeId: string, roomId: string, id: string) {
    await this.findOneByMember(userId, homeId, roomId, id);

    await this.logModel.where('device_id', toObjectId(id)).delete();
    await this.deviceAutomationModel
      .where('device_id', toObjectId(id))
      .delete();

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
    return toIdString(value);
  }
}
