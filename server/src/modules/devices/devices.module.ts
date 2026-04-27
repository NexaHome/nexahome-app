import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { DeviceAutomation } from '../../models/device-automation.model';
import { LogDevice } from '../../models/log.model';
import { HomesModule } from '../homes';
import { DevicesResolver } from './devices.resolver';
import { DevicesService } from './devices.service';

@Module({
  imports: [MongoloquentModule.forFeature([Device, Room, DeviceAutomation, LogDevice]), HomesModule],
  providers: [DevicesResolver, DevicesService],
})
export class DevicesModule {}