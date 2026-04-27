import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { LogDevice } from '../../models/log.model';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentHomeId, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateLogDeviceInput } from './dto/create-log-device.input';
import { LogDeviceService } from './log-device.service';

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
}