import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Automation } from '../../models/automation.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { AutomationsResolver } from './automations.resolver';
import { AutomationsService } from './automations.service';

@Module({
  imports: [MongoloquentModule.forFeature([Automation, DeviceAutomation])],
  providers: [AutomationsResolver, AutomationsService],
})
export class AutomationsModule {}