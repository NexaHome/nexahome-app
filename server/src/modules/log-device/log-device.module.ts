import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { LogDevice } from '../../models/log.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { HomesModule } from '../homes';
import { LogDeviceResolver } from './log-device.resolver';
import { LogDeviceService } from './log-device.service';

@Module({
  imports: [MongoloquentModule.forFeature([LogDevice, Device, Room]), HomesModule],
  providers: [LogDeviceResolver, LogDeviceService],
})
export class LogDeviceModule {}