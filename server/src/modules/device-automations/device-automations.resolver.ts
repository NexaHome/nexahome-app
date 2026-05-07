import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeviceAutomation } from '../../models/device-automation.model';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentHomeId, CurrentRoomId, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateDeviceAutomationInput } from './dto/create-device-automation.input';
import { DeviceAutomationsService } from './device-automations.service';

@Resolver(() => DeviceAutomation)
@UseGuards(GqlAuthGuard)
export class DeviceAutomationsResolver {
  constructor(private readonly deviceAutomationsService: DeviceAutomationsService) {}

  @Mutation(() => DeviceAutomation)
  attachDeviceAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
    @Args('deviceId') deviceId: string,
    @Args('createDeviceAutomationInput') createDeviceAutomationInput: CreateDeviceAutomationInput,
  ) {
    return this.deviceAutomationsService.attach(user.userId, homeId, roomId, deviceId, createDeviceAutomationInput);
  }

  @Mutation(() => Boolean)
  detachDeviceAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
    @Args('deviceId') deviceId: string,
    @Args('automationId') automationId: string,
  ) {
    return this.deviceAutomationsService.detach(user.userId, homeId, roomId, deviceId, automationId);
  }

  @Query(() => [DeviceAutomation], { name: 'deviceAutomationsByDevice' })
  findByDevice(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
    @Args('deviceId') deviceId: string,
  ) {
    return this.deviceAutomationsService.findByDevice(user.userId, homeId, roomId, deviceId);
  }

  @Query(() => [DeviceAutomation], { name: 'deviceAutomationsByAutomation' })
  findByAutomation(@CurrentUser() user: AuthenticatedUser, @Args('automationId') automationId: string) {
    return this.deviceAutomationsService.findByAutomation(user.userId, automationId);
  }
}