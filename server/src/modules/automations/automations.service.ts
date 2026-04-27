import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Automation } from '../../models/automation.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { CreateAutomationInput } from './dto/create-automation.input';
import { UpdateAutomationInput } from './dto/update-automation.input';
import { AutomationNotFoundException } from '../../common/exceptions/app.exceptions';
import { toIdString, toObjectId } from '../../common/utils/object-id.util';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectModel(Automation) private readonly automationModel: typeof Automation,
    @InjectModel(DeviceAutomation) private readonly deviceAutomationModel: typeof DeviceAutomation,
  ) {}

  async create(userId: string, createAutomationInput: CreateAutomationInput) {
    const automation = new this.automationModel();
    automation.user_id = toObjectId(userId);
    automation.name = createAutomationInput.name;
    automation.trigger = createAutomationInput.trigger;
    automation.action = createAutomationInput.action;
    automation.createdAt = new Date();
    await automation.save();

    return automation;
  }

  async findAllByUser(userId: string) {
    return this.automationModel.where('user_id', toObjectId(userId)).get();
  }

  async findOneByUser(id: string, userId: string) {
    const automation = await this.automationModel.find(id);
    if (!automation || this.toIdString(automation.user_id) !== userId) {
      throw new AutomationNotFoundException();
    }

    return automation;
  }

  async update(userId: string, id: string, updateAutomationInput: UpdateAutomationInput) {
    const automation = await this.findOneByUser(id, userId);

    const updatePayload: Record<string, string> = {};

    if (typeof updateAutomationInput.name !== 'undefined') {
      updatePayload.name = updateAutomationInput.name;
    }

    if (typeof updateAutomationInput.trigger !== 'undefined') {
      updatePayload.trigger = updateAutomationInput.trigger;
    }

    if (typeof updateAutomationInput.action !== 'undefined') {
      updatePayload.action = updateAutomationInput.action;
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.automationModel.where('_id', id).update(updatePayload);
    }

    return this.findOneByUser(this.toIdString(automation._id), userId);
  }

  async remove(userId: string, id: string) {
    await this.findOneByUser(id, userId);

    await this.deviceAutomationModel.where('automation_id', toObjectId(id)).delete();

    const deletedCount = await this.automationModel.destroy(id);

    return deletedCount > 0;
  }

  private toIdString(value: unknown) {
    return toIdString(value);
  }
}
