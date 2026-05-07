import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Room } from '../../models/room.model';
import { Device } from '../../models/device.model';
import { HomesModule } from '../homes';
import { RoomsResolver } from './rooms.resolver';
import { RoomsService } from './rooms.service';

@Module({
  imports: [MongoloquentModule.forFeature([Room, Device]), HomesModule],
  providers: [RoomsResolver, RoomsService],
})
export class RoomsModule {}
