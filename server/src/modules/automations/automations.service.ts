import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Automation } from '../../models/automation.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { CreateAutomationInput } from './dto/create-automation.input';
import { UpdateAutomationInput } from './dto/update-automation.input';
import { AutomationNotFoundException } from '../../common/exceptions/app.exceptions';
import { toIdString, toObjectId } from '../../common/utils/object-id.util';
import { AutomationQueueService } from './automation-queue.service';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectModel(Automation) private readonly automationModel: typeof Automation,
    @InjectModel(DeviceAutomation) private readonly deviceAutomationModel: typeof DeviceAutomation,
    private readonly automationQueueService: AutomationQueueService,
  ) {}

  async create(userId: string, createAutomationInput: CreateAutomationInput, homeId?: string) {
    const automation = new this.automationModel();
    automation.user_id = toObjectId(userId);
    automation.name = createAutomationInput.name;
    automation.trigger = this.serializeTrigger(createAutomationInput.trigger);
    automation.action = this.serializeAction(createAutomationInput.action, homeId);
    automation.createdAt = new Date();
    await automation.save();

    const automationId = this.toIdString(automation._id);
    const delayMs = this.automationQueueService.resolveDelayMs(automation.trigger);
    await this.automationQueueService.enqueueAutomation(automationId, delayMs);

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

  async update(userId: string, id: string, updateAutomationInput: UpdateAutomationInput, homeId?: string) {
    const automation = await this.findOneByUser(id, userId);

    const updatePayload: Record<string, string> = {};

    if (typeof updateAutomationInput.name !== 'undefined') {
      updatePayload.name = updateAutomationInput.name;
    }

    if (typeof updateAutomationInput.trigger !== 'undefined') {
      updatePayload.trigger = this.serializeTrigger(updateAutomationInput.trigger);
    }

    if (typeof updateAutomationInput.action !== 'undefined') {
      updatePayload.action = this.serializeAction(
        updateAutomationInput.action,
        homeId ?? this.extractHomeIdFromAction(automation.action),
      );
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.automationModel.where('_id', id).update(updatePayload);
    }

    const automationId = this.toIdString(automation._id);
    const delayMs = this.automationQueueService.resolveDelayMs(
      typeof updateAutomationInput.trigger !== 'undefined'
        ? this.serializeTrigger(updateAutomationInput.trigger)
        : automation.trigger,
    );
    await this.automationQueueService.enqueueAutomation(automationId, delayMs);

    return this.findOneByUser(this.toIdString(automation._id), userId);
  }

  async remove(userId: string, id: string) {
    await this.findOneByUser(id, userId);

    await this.automationQueueService.cancelAutomation(id);
    await this.deviceAutomationModel.where('automation_id', toObjectId(id)).delete();

    const deletedCount = await this.automationModel.destroy(id);

    return deletedCount > 0;
  }

  private toIdString(value: unknown) {
    return toIdString(value);
  }

  private serializeTrigger(trigger: CreateAutomationInput['trigger'] | UpdateAutomationInput['trigger'] | undefined) {
    if (!trigger) {
      return JSON.stringify({ type: 'delay' });
    }

    const currentTrigger = trigger;
    return JSON.stringify({
      type: this.normalizeTriggerType(currentTrigger.type),
      ...(typeof currentTrigger.delayMs === 'number' ? { delayMs: currentTrigger.delayMs } : {}),
      ...(typeof currentTrigger.runAt === 'string' ? { runAt: currentTrigger.runAt } : {}),
    });
  }

  private serializeAction(
    action: CreateAutomationInput['action'] | UpdateAutomationInput['action'] | undefined,
    homeId?: string,
  ) {
    if (!action) {
      return JSON.stringify({ command: 'allDevicesOff', ...(homeId ? { homeId } : {}) });
    }

    const currentAction = action;
    return JSON.stringify({
      command: this.normalizeActionCommand(currentAction.command),
      ...(typeof currentAction.enabled === 'boolean' ? { enabled: currentAction.enabled } : {}),
      ...(typeof (currentAction as any).state === 'string' ? { state: (currentAction as any).state } : {}),
      ...(homeId ? { homeId } : {}),
    });
  }

  private normalizeTriggerType(value: string) {
    if (value === 'Delay' || value === 'delay') {
      return 'delay';
    }

    if (value === 'Schedule' || value === 'schedule') {
      return 'schedule';
    }

    return value;
  }

  private normalizeActionCommand(value: string) {
    if (value === 'AllDevicesOn' || value === 'allDevicesOn') {
      return 'allDevicesOn';
    }

    if (value === 'AllDevicesOff' || value === 'allDevicesOff') {
      return 'allDevicesOff';
    }

    if (value === 'SetAwayMode' || value === 'setAwayMode') {
      return 'setAwayMode';
    }

    if (value === 'ToggleDevices' || value === 'toggleDevices') {
      return 'toggleDevices';
    }

    return value;
  }

  private extractHomeIdFromAction(action: string) {
    try {
      const parsed = JSON.parse(action);
      return typeof parsed.homeId === 'string' ? parsed.homeId : undefined;
    } catch {
      return undefined;
    }
  }
}
