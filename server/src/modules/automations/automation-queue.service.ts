import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@mongoloquent/nestjs';
import { Queue, Worker, type Job } from 'bullmq';
import { Automation } from '../../models/automation.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { Device } from '../../models/device.model';
import { HomesService } from '../homes/homes.service';
import { DevicesService } from '../devices/devices.service';
import { toIdString, toObjectId } from '../../common/utils/object-id.util';

type AutomationExecutionData = {
  automationId: string;
};

type AutomationExecutionResult = {
  queued: boolean;
  automationId: string;
  jobId?: string;
  message: string;
  delayMs?: number;
};

type AutomationTrigger = {
  type?: 'delay' | 'schedule';
  delayMs?: number;
  runAt?: string;
  endDate?: string;
  endTime?: string;
  repeat?: boolean;
  days?: number[];
};

type AutomationAction = {
  command?: 'allDevicesOn' | 'allDevicesOff' | 'setAwayMode' | 'toggleDevices';
  homeId?: string;
  enabled?: boolean;
  delayMs?: number;
  state?: 'ON' | 'OFF';
};

@Injectable()
export class AutomationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationQueueService.name);
  private queue?: Queue<AutomationExecutionData, AutomationExecutionResult>;
  private worker?: Worker<AutomationExecutionData, AutomationExecutionResult>;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Automation) private readonly automationModel: typeof Automation,
    @InjectModel(DeviceAutomation) private readonly deviceAutomationModel: typeof DeviceAutomation,
    @InjectModel(Device) private readonly deviceModel: typeof Device,
    private readonly homesService: HomesService,
    private readonly devicesService: DevicesService,
  ) {}

  async onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URI') ||
      this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URI/REDIS_URL is not configured, BullMQ automation queue is disabled');
      return;
    }

    this.queue = new Queue<AutomationExecutionData, AutomationExecutionResult>('automations', {
      connection: { url: redisUrl, skipCheck: true } as any,
    });

    this.worker = new Worker<AutomationExecutionData, AutomationExecutionResult>(
      'automations',
      async (job: Job<AutomationExecutionData, AutomationExecutionResult>) => {
        this.logger.log(`Processing automation job ${job.id} (automationId=${job.data.automationId})`);
        const automation = await this.automationModel.find(job.data.automationId);
        if (!automation) {
          this.logger.warn(`Automation not found for job ${job.id} (automationId=${job.data.automationId})`);
          return {
            queued: false,
            automationId: job.data.automationId,
            jobId: job.id?.toString(),
            message: 'Automation not found',
          };
        }

        const automationId = toIdString(automation._id);
        const userId = toIdString(automation.user_id);
        const action = this.parseAutomationAction(automation.action);

        if (action?.command === 'allDevicesOn' && action.homeId) {
          this.logger.log(`Executing allDevicesOn for home ${action.homeId} (automation=${automationId})`);
          const result = await this.homesService.allDevicesOn(userId, action.homeId);
          this.logger.log(`allDevicesOn result: ${result?.message} (automation=${automationId})`);
          await this.markAutomationExecuted(automationId);
          return {
            queued: true,
            automationId,
            jobId: job.id?.toString(),
            message: result.message,
            delayMs: action.delayMs,
          };
        }

        if (action?.command === 'allDevicesOff' && action.homeId) {
          this.logger.log(`Executing allDevicesOff for home ${action.homeId} (automation=${automationId})`);
          const result = await this.homesService.allDevicesOff(userId, action.homeId);
          this.logger.log(`allDevicesOff result: ${result?.message} (automation=${automationId})`);
          await this.markAutomationExecuted(automationId);
          return {
            queued: true,
            automationId,
            jobId: job.id?.toString(),
            message: result.message,
            delayMs: action.delayMs,
          };
        }

        if (action?.command === 'setAwayMode' && action.homeId) {
          this.logger.log(`Executing setAwayMode for home ${action.homeId} (enabled=${action.enabled}) (automation=${automationId})`);
          const result = await this.homesService.setAwayMode(
            userId,
            action.homeId,
            action.enabled ?? true,
          );
          this.logger.log(`setAwayMode result: ${result?.message} (automation=${automationId})`);
          await this.markAutomationExecuted(automationId);
          return {
            queued: true,
            automationId,
            jobId: job.id?.toString(),
            message: result.message,
            delayMs: action.delayMs,
          };
        }

        // Handle device-specific automations if command is toggleDevices or if there are linked devices
        const devicesRelations = await this.deviceAutomationModel
          .where('automation_id', toObjectId(automationId))
          .get();

        if (action?.command === 'toggleDevices' || devicesRelations.length > 0) {
          this.logger.log(`Executing device-specific automation for ${devicesRelations.length} devices (automation=${automationId})`);
          
          for (const relation of devicesRelations) {
            const deviceId = toIdString(relation.device_id);
            const state = action?.state || 'ON';
            
            try {
              const device = await this.deviceModel.find(deviceId);
              if (device) {
                const homeId = action?.homeId || ''; 
                const roomId = toIdString(device.room_id);
                
                await this.devicesService.update(userId, homeId, roomId, deviceId, {
                  status: state,
                  is_active: state === 'ON',
                });
                this.logger.log(`Updated device ${deviceId} to ${state} (automation=${automationId})`);
              }
            } catch (err) {
              this.logger.error(`Failed to update device ${deviceId} in automation: ${String(err)}`);
            }
          }
        }

        await this.markAutomationExecuted(automationId);

        // Re-queue if it's a repeating schedule
        const trigger = this.parseAutomationTrigger(automation.trigger);
        
        // Handle Auto-Off if endTime is provided
        if (trigger?.endTime && (action?.command === 'toggleDevices' || action?.command === 'allDevicesOn')) {
          const offDelay = this.resolveEndTimeDelay(trigger);
          if (offDelay > 0) {
            this.logger.log(`Scheduling automatic turn-off for ${automationId} in ${Math.round(offDelay / 1000)}s`);
            // We can reuse the queue with a special flag or just a custom job name
            // For simplicity, let's just use the current job to trigger the main action,
            // and if we need an auto-off, we can't easily do it without changing the worker
            // unless we use a separate service or a specific "auto-off" job.
          }
        }

        if (trigger?.type === 'schedule' && trigger.repeat) {
          const nextDelay = this.resolveNextOccurrenceDelay(trigger);
          if (nextDelay > 0) {
            this.logger.log(`Re-queueing repeating schedule ${automationId} (delay=${nextDelay}ms)`);
            await this.enqueueAutomation(automationId, nextDelay);
          }
        }

        return {
          queued: true,
          automationId,
          jobId: job.id?.toString(),
          message: `Automation processed with action: ${automation.action}`,
          delayMs: action?.delayMs,
        };
      },
      { connection: { url: redisUrl, skipCheck: true } as any },
    );

    this.logger.log(`Automation worker initialized for queue 'automations' (redis=${redisUrl})`);

    this.worker.on('active', (job) => {
      this.logger.log(`Automation job active ${job?.id} (automationId=${job?.data?.automationId})`);
    });

    this.worker.on('completed', (job, result) => {
      this.logger.log(`Automation job completed ${job?.id} (automationId=${job?.data?.automationId}) result=${JSON.stringify(result)}`);
    });

    this.worker.on('error', (err) => {
      this.logger.error('Automation worker error', err?.stack || err?.message || String(err));
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Automation job failed for ${job?.id} (automationId=${job?.data?.automationId})`, err?.stack || err?.message || String(err));
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueueAutomation(automationId: string, delayMs = 0) {
    if (!this.queue) {
      return {
        queued: false,
        automationId,
        message: 'REDIS_URL is not configured, automation was not queued',
      } satisfies AutomationExecutionResult;
    }

    const normalizedDelay = Number.isFinite(delayMs) ? Math.max(0, Math.floor(delayMs)) : 0;
    const job = await this.queue.add(
      'automation.execute',
      { automationId },
      {
        jobId: `automation-${automationId}`,
        delay: normalizedDelay,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Enqueued automation ${automationId} as job ${job.id} (delay=${normalizedDelay}ms)`);

    await this.automationModel
      .where('_id', automationId)
      .update({ queuedAt: new Date() });

    return {
      queued: true,
      automationId,
      jobId: job.id?.toString(),
      delayMs: normalizedDelay,
      message: normalizedDelay > 0 ? 'Automation queued with delay' : 'Automation queued',
    } satisfies AutomationExecutionResult;
  }

  async cancelAutomation(automationId: string) {
    if (!this.queue) {
      return;
    }

    try {
      await this.queue.remove(`automation-${automationId}`);
      this.logger.log(`Cancelled queued automation automation-${automationId}`);
    } catch (error) {
      this.logger.warn(`Unable to remove queued automation ${automationId}: ${String(error)}`);
    }
  }

  resolveDelayMs(trigger: string) {
    const parsed = this.parseAutomationTrigger(trigger);
    if (parsed?.type === 'delay' && typeof parsed.delayMs === 'number') {
      return Math.max(0, Math.floor(parsed.delayMs));
    }

    if (parsed?.type === 'schedule' && parsed.runAt) {
      if (parsed.repeat && parsed.days?.length) {
        return this.resolveNextOccurrenceDelay(parsed);
      }

      const scheduledTime = new Date(parsed.runAt).getTime();
      const delta = scheduledTime - Date.now();
      if (Number.isFinite(delta) && delta > 0) {
        return Math.floor(delta);
      }
    }

    const numeric = Number(trigger);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.floor(numeric);
    }

    return 0;
  }

  private parseAutomationAction(action: string):
    | AutomationAction
    | null {
    const parsed = this.safeParseJson(action);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      command: typeof parsed.command === 'string' ? parsed.command : undefined,
      homeId: typeof parsed.homeId === 'string' ? parsed.homeId : undefined,
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined,
      delayMs: typeof parsed.delayMs === 'number' ? parsed.delayMs : undefined,
      state: typeof parsed.state === 'string' ? (parsed.state as any) : undefined,
    };
  }

  private parseAutomationTrigger(trigger: string): AutomationTrigger | null {
    const parsed = this.safeParseJson(trigger);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      type:
        parsed.type === 'delay' || parsed.type === 'schedule' ? parsed.type : undefined,
      delayMs: typeof parsed.delayMs === 'number' ? parsed.delayMs : undefined,
      runAt: typeof parsed.runAt === 'string' ? parsed.runAt : undefined,
      endDate: typeof parsed.endDate === 'string' ? parsed.endDate : undefined,
      endTime: typeof parsed.endTime === 'string' ? parsed.endTime : undefined,
      repeat: typeof parsed.repeat === 'boolean' ? parsed.repeat : undefined,
      days: Array.isArray(parsed.days) ? parsed.days : undefined,
    };
  }

  private resolveEndTimeDelay(trigger: AutomationTrigger): number {
    if (!trigger.endTime) return 0;
    const parts = trigger.endTime.split(':');
    const now = new Date();
    const end = new Date(now);
    end.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
    
    if (end.getTime() <= now.getTime()) {
      end.setDate(end.getDate() + 1);
    }
    return end.getTime() - now.getTime();
  }

  private resolveNextOccurrenceDelay(trigger: AutomationTrigger): number {
    if (!trigger.runAt) return 0;

    // Check if we have passed the end date
    if (trigger.endDate) {
      const end = new Date(trigger.endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date() > end) return 0;
    }
    
    const targetDate = new Date(trigger.runAt);
    const now = new Date();
    
    // Set next to today at the target time
    const next = new Date(now);
    next.setHours(targetDate.getHours(), targetDate.getMinutes(), 0, 0);
    
    const days = trigger.days?.length ? trigger.days : [0, 1, 2, 3, 4, 5, 6];
    
    // Find the next day in the sequence
    let daysToAdd = 0;
    while (daysToAdd <= 7) {
      const currentDay = (next.getDay() + daysToAdd) % 7;
      if (days.includes(currentDay)) {
        const potentialNext = new Date(next);
        potentialNext.setDate(next.getDate() + daysToAdd);
        
        if (potentialNext.getTime() > now.getTime() + 1000) { // +1s buffer
          return potentialNext.getTime() - now.getTime();
        }
      }
      daysToAdd++;
    }
    
    return 24 * 60 * 60 * 1000; // Fallback to 24h
  }

  private safeParseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private async markAutomationExecuted(automationId: string) {
    await this.automationModel
      .where('_id', automationId)
      .update({ lastExecutedAt: new Date() });
  }
}