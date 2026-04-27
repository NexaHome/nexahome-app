import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { DeviceAutomation } from '../../models/device-automation.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { Automation } from '../../models/automation.model';
import { DeviceNotFoundException, RoomNotFoundException, AutomationNotFoundException } from '../../common/exceptions/app.exceptions';
import { CreateDeviceAutomationInput } from './dto/create-device-automation.input';
import { toIdString, toObjectId } from '../../common/utils/object-id.util';

@Injectable()
export class DeviceAutomationsService {
  constructor(
    @InjectModel(DeviceAutomation) private readonly deviceAutomationModel: typeof DeviceAutomation,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    @InjectModel(Room) private readonly roomModel: typeof Room,
    @InjectModel(Automation) private readonly automationModel: typeof Automation,
  ) {}

  async attach(userId: string, homeId: string, roomId: string, deviceId: string, input: CreateDeviceAutomationInput) {
    const device = await this.findDeviceInHome(deviceId, homeId, roomId);
    const automation = await this.findUserAutomation(input.automationId, userId);

    const existing = await this.deviceAutomationModel
      .where('device_id', toObjectId(this.toIdString(device._id)))
      .where('automation_id', toObjectId(this.toIdString(automation._id)))
      .first();

    if (existing) {
      return existing;
    }

    return this.deviceAutomationModel.create({
      device_id: toObjectId(this.toIdString(device._id)),
      automation_id: toObjectId(this.toIdString(automation._id)),
      createdAt: new Date(),
    });
  }

  async detach(userId: string, homeId: string, roomId: string, deviceId: string, automationId: string) {
    await this.findDeviceInHome(deviceId, homeId, roomId);
    await this.findUserAutomation(automationId, userId);

    await this.deviceAutomationModel.where('device_id', toObjectId(deviceId)).where('automation_id', toObjectId(automationId)).delete();

    return true;
  }

  async findByDevice(userId: string, homeId: string, roomId: string, deviceId: string) {
    await this.findDeviceInHome(deviceId, homeId, roomId);

    const relations = await this.deviceAutomationModel.where('device_id', toObjectId(deviceId)).get();
    if (relations.length === 0) {
      return [];
    }

    const automationIds = relations.map((relation) => this.toIdString(relation.automation_id)).filter((id) => id.length > 0);
    const automations = await this.automationModel.where('user_id', toObjectId(userId)).get();
    const allowedAutomationIds = automations.map((automation) => this.toIdString(automation._id));

    return relations.filter((relation) => allowedAutomationIds.includes(this.toIdString(relation.automation_id)) && automationIds.includes(this.toIdString(relation.automation_id)));
  }

  async findByAutomation(userId: string, automationId: string) {
    await this.findUserAutomation(automationId, userId);

    return this.deviceAutomationModel.where('automation_id', toObjectId(automationId)).get();
  }

  private async findDeviceInHome(deviceId: string, homeId: string, roomId: string) {
    const device = await this.deviceModel.find(deviceId);
    if (!device) {
      throw new DeviceNotFoundException();
    }

    const room = await this.roomModel.find(this.toIdString(device.room_id));
    if (!room || this.toIdString(room._id) !== roomId || this.toIdString(room.home_id) !== homeId) {
      throw new RoomNotFoundException();
    }

    return device;
  }

  private async findUserAutomation(automationId: string, userId: string) {
    const automation = await this.automationModel.find(automationId);
    if (!automation || this.toIdString(automation.user_id) !== userId) {
      throw new AutomationNotFoundException();
    }

    return automation;
  }

  private toIdString(value: unknown) {
    return toIdString(value);
  }
}
