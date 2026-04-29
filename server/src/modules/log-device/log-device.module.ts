import { forwardRef, Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { LogDevice } from '../../models/log.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { HomeUser } from '../../models/home-user.model';
import { User } from '../../models/user.model';
import { HomesModule } from '../homes';
import { LogDeviceResolver } from './log-device.resolver';
import { LogDeviceService } from './log-device.service';
import { LogDeviceController } from './log-device.controller';
import { PushNotificationModule } from '../push-notification/push-notification.module';

@Module({
  imports: [
    MongoloquentModule.forFeature([LogDevice, Device, Room, HomeUser, User]),
    forwardRef(() => HomesModule),
    PushNotificationModule,
  ],
  controllers: [LogDeviceController],
  providers: [LogDeviceResolver, LogDeviceService],
  exports: [LogDeviceService],
})
export class LogDeviceModule {}