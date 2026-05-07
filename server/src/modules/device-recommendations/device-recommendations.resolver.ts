import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeviceRecommendation } from '../../models/device-recommendation.model';
import { DeviceRecommendationsService } from './device-recommendations.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentHomeId, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => DeviceRecommendation)
@UseGuards(GqlAuthGuard)
export class DeviceRecommendationsResolver {
  constructor(private readonly recService: DeviceRecommendationsService) {}

  @Query(() => [DeviceRecommendation], { name: 'recommendationsByDevice' })
  findByDevice(@CurrentUser() user: AuthenticatedUser, @Args('deviceId') deviceId: string) {
    return this.recService.findByDevice(deviceId);
  }

  @Query(() => [DeviceRecommendation], { name: 'recommendationsByHome' })
  findByHome(@CurrentUser() user: AuthenticatedUser, @CurrentHomeId() homeId: string) {
    return this.recService.findByHome(homeId);
  }

  @Mutation(() => [DeviceRecommendation], { name: 'generateRecommendations' })
  generate(@CurrentUser() user: AuthenticatedUser, @Args('deviceId') deviceId: string) {
    return this.recService.generate(deviceId);
  }

  @Mutation(() => [DeviceRecommendation], { name: 'generateHomeRecommendations' })
  generateForHome(@CurrentUser() user: AuthenticatedUser, @CurrentHomeId() homeId: string) {
    return this.recService.generateForHome(homeId);
  }
}
