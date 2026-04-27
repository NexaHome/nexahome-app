import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { DeviceAutomation } from '../../models/device-automation.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { Automation } from '../../models/automation.model';
import { DeviceAutomationsResolver } from './device-automations.resolver';
import { DeviceAutomationsService } from './device-automations.service';

@Module({
  imports: [MongoloquentModule.forFeature([DeviceAutomation, Device, Room, Automation])],
  providers: [DeviceAutomationsResolver, DeviceAutomationsService],
})
export class DeviceAutomationsModule {}