import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { LogDevice } from '../../models/log.model';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentHomeId, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateLogDeviceInput } from './dto/create-log-device.input';
import { LogDeviceService } from './log-device.service';
import { Device } from '../../models/device.model';

@Resolver(() => LogDevice)
@UseGuards(GqlAuthGuard)
export class LogDeviceResolver {
  constructor(private readonly logDeviceService: LogDeviceService) {}

  @Mutation(() => LogDevice)
  createLog(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @Args('createLogInput') createLogInput: CreateLogDeviceInput,
  ) {
    return this.logDeviceService.create(user.userId, homeId, createLogInput);
  }

  @Query(() => [LogDevice], { name: 'logsByDevice' })
  findLogsByDevice(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @Args('deviceId') deviceId: string,
  ) {
    return this.logDeviceService.findByDevice(user.userId, homeId, deviceId);
  }

  @Query(() => [LogDevice], { name: 'logsByHome' })
  findLogsByHome(@CurrentUser() user: AuthenticatedUser, @CurrentHomeId() homeId: string) {
    return this.logDeviceService.findByHome(user.userId, homeId);
  }

  @ResolveField(() => String)
  value(@Parent() log: LogDevice) {
    return typeof log.value === 'object' ? JSON.stringify(log.value) : String(log.value);
  }

  @ResolveField(() => Device, { nullable: true })
  async device_info(@Parent() log: LogDevice) {
    return Device.find(log.device_id.toString());
  }
}