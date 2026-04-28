import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Automation } from '../../models/automation.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { HomesModule } from '../homes';
import { AutomationsResolver } from './automations.resolver';
import { AutomationsService } from './automations.service';
import { AutomationQueueService } from './automation-queue.service';

@Module({
  imports: [MongoloquentModule.forFeature([Automation, DeviceAutomation]), HomesModule],
  providers: [AutomationsResolver, AutomationsService, AutomationQueueService],
})
export class AutomationsModule {}