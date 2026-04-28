import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Home } from '../../models/home.model';
import { Room } from '../../models/room.model';
import { Device } from '../../models/device.model';
import { HomeUser } from '../../models/home-user.model';
import { User } from '../../models/user.model';
import { CreateHomeInput } from './dto/create-home.input';
import { UpdateHomeInput } from './dto/update-home.input';
import {
  HomeAccessDeniedException,
  HomeMemberAlreadyExistsException,
  HomeNotFoundException,
  UserNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import { DashboardHome } from './dto/dashboard-home.type';
import { QuickActionResult } from './dto/quick-action-result.type';
import { RoomSummary } from './dto/room-summary.type';
import { AddHomeMemberInput } from './dto/add-home-member.input';
import { HomeMember } from './dto/home-member.type';
import {
  toIdString,
  toObjectId,
  toObjectIds,
} from '../../common/utils/object-id.util';

@Injectable()
export class HomesService {
  constructor(
    @InjectModel(Home) private readonly homeModel: typeof Home,
    @InjectModel(Room) private readonly roomModel: typeof Room,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(HomeUser) private readonly homeUserModel: typeof HomeUser,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {}

  async create(userId: string, createHomeInput: CreateHomeInput) {
    const home = new this.homeModel();
    home.name = createHomeInput.name;
    home.owner_id = toObjectId(userId);
    home.createdAt = new Date();
    // Generate a 6-character uppercase alphanumeric invite code
    home.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await home.save();

    const homeId = this.toIdString(home._id);
    await this.homeUserModel.create({
      home_id: toObjectId(homeId),
      user_id: toObjectId(userId),
      createdAt: new Date(),
    });

    return home;
  }

  async findAllByMember(userId: string) {
    const memberships = await this.homeUserModel
      .where('user_id', toObjectId(userId))
      .get();

    const homeIds = memberships
      .map((membership) => this.toIdString(membership.home_id))
      .filter((id) => id.length > 0);

    if (homeIds.length === 0) {
      return [];
    }

    return await this.homeModel.whereIn('_id', toObjectIds(homeIds)).get();
  }

  async findOneByMember(id: string, userId: string) {
    if (!id || !this.isValidObjectId(id)) {
      throw new HomeNotFoundException();
    }

    await this.assertMemberAccess(id, userId);

    const home = await this.homeModel.find(id);
    if (!home) {
      throw new HomeNotFoundException();
    }

    return home;
  }

  async update(id: string, userId: string, updateHomeInput: UpdateHomeInput) {
    const home = await this.findOneByMember(id, userId);

    const updateData: any = {};
    if (typeof updateHomeInput.name !== 'undefined') {
      updateData.name = updateHomeInput.name;
    }

    // Auto-generate invite code for older homes that don't have it
    if (!home.invite_code) {
      updateData.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (Object.keys(updateData).length > 0) {
      await this.homeModel.where('_id', id).update(updateData);
    }

    return await this.findOneByMember(id, userId);
  }

  async remove(id: string, userId: string) {
    await this.assertHomeOwner(id, userId);

    const deletedCount = await this.homeModel.destroy(id);
    await this.homeUserModel.where('home_id', toObjectId(id)).delete();
    return deletedCount > 0;
  }

  async addMember(
    homeId: string,
    actorUserId: string,
    input: AddHomeMemberInput,
  ) {
    await this.assertHomeOwner(homeId, actorUserId);

    const user = await this.resolveInviteTargetUser(input);
    if (!user) {
      throw new UserNotFoundException();
    }

    const targetUserId = this.toIdString(user._id);

    const existingMembership = await this.homeUserModel
      .where('home_id', toObjectId(homeId))
      .where('user_id', toObjectId(targetUserId))
      .first();

    if (existingMembership) {
      throw new HomeMemberAlreadyExistsException();
    }

    return this.homeUserModel.create({
      home_id: toObjectId(homeId),
      user_id: toObjectId(targetUserId),
      createdAt: new Date(),
    });
  }

  async joinHomeByCode(userId: string, inviteCode: string) {
    if (!inviteCode || typeof inviteCode !== 'string') {
      throw new ValidationException('Invalid invite code');
    }

    const home = await this.homeModel.where('invite_code', inviteCode.toUpperCase()).first();
    if (!home) {
      throw new HomeNotFoundException();
    }

    const homeId = this.toIdString(home._id);

    const existingMembership = await this.homeUserModel
      .where('home_id', toObjectId(homeId))
      .where('user_id', toObjectId(userId))
      .first();

    if (existingMembership) {
      throw new HomeMemberAlreadyExistsException();
    }

    await this.homeUserModel.create({
      home_id: toObjectId(homeId),
      user_id: toObjectId(userId),
      createdAt: new Date(),
    });

    return home;
  }

  async getMembers(homeId: string, userId: string): Promise<HomeMember[]> {
    await this.assertMemberAccess(homeId, userId);

    const memberships = await this.homeUserModel
      .where('home_id', toObjectId(homeId))
      .get();
    if (memberships.length === 0) {
      return [];
    }

    const memberIds = memberships
      .map((membership) => this.toIdString(membership.user_id))
      .filter((id) => id.length > 0);

    const users = await this.userModel
      .whereIn('_id', toObjectIds(memberIds))
      .get();

    return memberships
      .map((membership) => {
        const memberUserId = this.toIdString(membership.user_id);
        const memberUser = users.find(
          (item) => this.toIdString(item._id) === memberUserId,
        );
        if (!memberUser) {
          return null;
        }

        return {
          userId: memberUserId,
          name: memberUser.name,
          email: memberUser.email,
        };
      })
      .filter((item): item is HomeMember => item !== null);
  }

  async getDashboard(userId: string, homeId?: string): Promise<DashboardHome> {
    const home = await this.resolveTargetHome(userId, homeId);
    const selectedHomeId = this.toIdString(home._id);

    const rooms = await this.roomModel
      .where('home_id', toObjectId(selectedHomeId))
      .get();
    const roomIds = rooms
      .map((room) => this.toIdString(room._id))
      .filter((id) => id.length > 0);

    const devices =
      roomIds.length > 0
        ? await this.deviceModel.whereIn('room_id', toObjectIds(roomIds)).get()
        : [];

    const activeDevicesCount = devices.filter((device) =>
      this.isActiveStatus(device.status),
    ).length;

    return {
      homeId: selectedHomeId,
      homeName: home.name,
      homeStatus: activeDevicesCount > 0 ? 'Online' : 'Offline',
      roomsCount: rooms.length,
      activeDevicesCount,
    };
  }

  async getRoomSummaries(
    userId: string,
    homeId?: string,
  ): Promise<RoomSummary[]> {
    const home = await this.resolveTargetHome(userId, homeId);
    const selectedHomeId = this.toIdString(home._id);

    const rooms = await this.roomModel
      .where('home_id', toObjectId(selectedHomeId))
      .get();
    if (rooms.length === 0) {
      return [];
    }

    const roomIds = rooms
      .map((room) => this.toIdString(room._id))
      .filter((id) => id.length > 0);

    const devices = await this.deviceModel
      .whereIn('room_id', toObjectIds(roomIds))
      .get();

    return rooms.map((room) => {
      const roomId = this.toIdString(room._id);
      const roomDevices = devices.filter(
        (device) => this.toIdString(device.room_id) === roomId,
      );
      const activeDevices = roomDevices.filter((device) =>
        this.isActiveStatus(device.status),
      ).length;
      const totalDevices = roomDevices.length;

      return {
        roomId,
        name: room.name,
        activeDevices,
        totalDevices,
        subtitle: this.buildRoomSubtitle(activeDevices, totalDevices),
      };
    });
  }

  async allDevicesOn(
    userId: string,
    homeId: string,
  ): Promise<QuickActionResult> {
    return this.setAllDevicesStatus(
      userId,
      homeId,
      'ON',
      'All devices turned on',
    );
  }

  async allDevicesOff(
    userId: string,
    homeId: string,
  ): Promise<QuickActionResult> {
    return this.setAllDevicesStatus(
      userId,
      homeId,
      'OFF',
      'All devices turned off',
    );
  }

  async setAwayMode(
    userId: string,
    homeId: string,
    enabled: boolean,
  ): Promise<QuickActionResult> {
    if (!enabled) {
      await this.findOneByMember(homeId, userId);
      return {
        success: true,
        affectedDevices: 0,
        message: 'Away mode disabled',
      };
    }

    return this.setAllDevicesStatus(
      userId,
      homeId,
      'OFF',
      'Away mode enabled. Devices turned off',
    );
  }

  private async setAllDevicesStatus(
    userId: string,
    homeId: string,
    status: string,
    message: string,
  ): Promise<QuickActionResult> {
    await this.findOneByMember(homeId, userId);

    const rooms = await this.roomModel
      .where('home_id', toObjectId(homeId))
      .get();
    if (rooms.length === 0) {
      return {
        success: true,
        affectedDevices: 0,
        message,
      };
    }

    const roomIds = rooms
      .map((room) => this.toIdString(room._id))
      .filter((id) => id.length > 0);

    const affectedDevices = await this.deviceModel
      .whereIn('room_id', toObjectIds(roomIds))
      .updateMany({ status });

    return {
      success: true,
      affectedDevices,
      message,
    };
  }

  private async resolveTargetHome(userId: string, homeId?: string) {
    if (homeId) {
      return this.findOneByMember(homeId, userId);
    }

    const firstMembership = await this.homeUserModel
      .where('user_id', toObjectId(userId))
      .first();

    if (!firstMembership) {
      throw new HomeNotFoundException();
    }

    const selectedHomeId = this.toIdString(firstMembership.home_id);
    if (!selectedHomeId) {
      throw new HomeNotFoundException();
    }

    const home = await this.homeModel.find(selectedHomeId);
    if (!home) {
      throw new HomeNotFoundException();
    }

    return home;
  }

  private async assertMemberAccess(homeId: string, userId: string) {
    const membership = await this.homeUserModel
      .where('home_id', toObjectId(homeId))
      .where('user_id', toObjectId(userId))
      .first();

    if (!membership) {
      throw new HomeAccessDeniedException();
    }

    return membership;
  }

  private async assertHomeOwner(homeId: string, userId: string) {
    if (!homeId || !this.isValidObjectId(homeId)) {
      throw new HomeNotFoundException();
    }

    const home = await this.homeModel.find(homeId);
    if (!home) {
      throw new HomeNotFoundException();
    }

    await this.assertMemberAccess(homeId, userId);

    if (this.toIdString(home.owner_id) !== userId) {
      throw new HomeAccessDeniedException();
    }
  }

  private isActiveStatus(status: string | undefined) {
    if (!status) {
      return false;
    }

    return status.toUpperCase() === 'ON';
  }

  private buildRoomSubtitle(activeDevices: number, totalDevices: number) {
    if (totalDevices === 0) {
      return 'No devices';
    }

    if (activeDevices === 0) {
      return 'All off';
    }

    if (activeDevices === totalDevices) {
      return 'All on';
    }

    return `${activeDevices} device${activeDevices > 1 ? 's' : ''} on`;
  }

  private isValidObjectId(id: string) {
    return id && /^[0-9a-fA-F]{24}$/.test(id);
  }

  private async resolveInviteTargetUser(input: AddHomeMemberInput) {
    if (input.userId) {
      return this.userModel.find(input.userId);
    }

    if (input.email) {
      return this.userModel.where('email', input.email).first();
    }

    throw new ValidationException(
      'Provide either userId or email to add a member',
    );
  }

  private toIdString(value: unknown) {
    return toIdString(value);
  }
}
