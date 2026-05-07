import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { DeviceRecommendation } from '../../models/device-recommendation.model';
import { Device } from '../../models/device.model';
import { Room } from '../../models/room.model';
import { DeviceRecommendationsResolver } from './device-recommendations.resolver';
import { DeviceRecommendationsService } from './device-recommendations.service'; 

@Module({
  imports: [MongoloquentModule.forFeature([DeviceRecommendation, Device, Room])],
  providers: [DeviceRecommendationsResolver, DeviceRecommendationsService],
  exports: [DeviceRecommendationsService],
})
export class DeviceRecommendationsModule {}
