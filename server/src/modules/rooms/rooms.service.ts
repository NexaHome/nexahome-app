import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Room } from '../../models/room.model';
import { Device } from '../../models/device.model';
import { CreateRoomInput } from './dto/create-room.input';
import { UpdateRoomInput } from './dto/update-room.input';
import { HomesService } from '../homes/homes.service';
import { RoomNotFoundException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room) private readonly roomModel: typeof Room,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    private readonly homesService: HomesService,
  ) {}

  async create(userId: string, homeId: string, name: string) {
    // Verify user has access to this home
    await this.homesService.findOneByMember(homeId, userId);

    const room = new this.roomModel();
    room.home_id = homeId;
    room.name = name;
    room.createdAt = new Date();
    await room.save();

    return room;
  }

  async findAllByHome(homeId: string, userId: string) {
    // Verify user has access to this home
    await this.homesService.findOneByMember(homeId, userId);

    return this.roomModel.where('home_id', homeId).get();
  }

  async findOneByMember(id: string, userId: string) {
    const room = await this.roomModel.find(id);
    if (!room) {
      throw new RoomNotFoundException();
    }

    // Verify user has access to the home this room belongs to
    await this.homesService.findOneByMember(this.toIdString(room.home_id), userId);
    return room;
  }

  async update(userId: string, id: string, updateRoomInput: UpdateRoomInput) {
    const room = await this.findOneByMember(id, userId);

    if (typeof updateRoomInput.name !== 'undefined') {
      await this.roomModel.where('_id', id).update({
        name: updateRoomInput.name,
      });
    }

    return this.findOneByMember(this.toIdString(room._id), userId);
  }

  async remove(userId: string, id: string) {
    await this.findOneByMember(id, userId);

    // Delete all devices in this room
    await this.deviceModel.where('room_id', id).delete();
    
    // Delete the room
    const deletedCount = await this.roomModel.destroy(id);

    return deletedCount > 0;
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
