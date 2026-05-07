import { forwardRef, Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Home } from '../../models/home.model';
import { Room } from '../../models/room.model';
import { Device } from '../../models/device.model';
import { HomeUser } from '../../models/home-user.model';
import { User } from '../../models/user.model';
import { HomesResolver } from './homes.resolver';
import { HomesService } from './homes.service';

import { AntaresModule } from '../antares/antares.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';

@Module({
  imports: [
    MongoloquentModule.forFeature([Home, Room, Device, HomeUser, User]),
    forwardRef(() => AntaresModule),
    PushNotificationModule,
  ],
  providers: [HomesResolver, HomesService],
  exports: [HomesService],
})
export class HomesModule {}
