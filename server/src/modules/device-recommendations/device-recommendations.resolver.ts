import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeviceRecommendation } from '../../models/device-recommendation.model';
import { DeviceRecommendationsService } from './device-recommendations.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => DeviceRecommendation)
@UseGuards(GqlAuthGuard)
export class DeviceRecommendationsResolver {
  constructor(private readonly recService: DeviceRecommendationsService) {}

  @Query(() => [DeviceRecommendation], { name: 'recommendationsByDevice' })
  findByDevice(@CurrentUser() user: AuthenticatedUser, @Args('deviceId') deviceId: string) {
    return this.recService.findByDevice(deviceId);
  }

  @Mutation(() => [DeviceRecommendation], { name: 'generateRecommendations' })
  generate(@CurrentUser() user: AuthenticatedUser, @Args('deviceId') deviceId: string) {
    return this.recService.generate(deviceId);
  }
}
