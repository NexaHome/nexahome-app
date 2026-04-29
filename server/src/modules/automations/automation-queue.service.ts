import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@mongoloquent/nestjs';
import { Queue, Worker, type Job } from 'bullmq';
import { Automation } from '../../models/automation.model';
import { HomesService } from '../homes/homes.service';
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
};

type AutomationAction = {
  command?: 'allDevicesOn' | 'allDevicesOff' | 'setAwayMode';
  homeId?: string;
  enabled?: boolean;
  delayMs?: number;
};

@Injectable()
export class AutomationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationQueueService.name);
  private queue?: Queue<AutomationExecutionData, AutomationExecutionResult>;
  private worker?: Worker<AutomationExecutionData, AutomationExecutionResult>;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Automation) private readonly automationModel: typeof Automation,
    private readonly homesService: HomesService,
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

        await this.markAutomationExecuted(automationId);

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
    };
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