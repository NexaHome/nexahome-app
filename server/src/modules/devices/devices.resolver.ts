import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Device } from '../../models/device.model';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentHomeId, CurrentRoomId, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateDeviceInput } from './dto/create-device.input';
import { UpdateDeviceInput } from './dto/update-device.input';
import { DevicesService } from './devices.service';

@Resolver(() => Device)
@UseGuards(GqlAuthGuard)
export class DevicesResolver {
  constructor(private readonly devicesService: DevicesService) {}

  @Mutation(() => Device)
  createDevice(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
    @Args('createDeviceInput') createDeviceInput: CreateDeviceInput,
  ) {
    return this.devicesService.create(user.userId, homeId, roomId, createDeviceInput);
  }

  @Query(() => [Device], { name: 'devicesByRoom' })
  findDevicesByRoom(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
  ) {
    return this.devicesService.findAllByRoom(user.userId, homeId, roomId);
  }

  @Query(() => Device, { name: 'device' })
  findDeviceById(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
    @Args('id') id: string,
  ) {
    return this.devicesService.findOneByMember(user.userId, homeId, roomId, id);
  }

  @Mutation(() => Device)
  updateDevice(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
    @Args('id') id: string,
    @Args('updateDeviceInput') updateDeviceInput: UpdateDeviceInput,
  ) {
    return this.devicesService.update(user.userId, homeId, roomId, id, updateDeviceInput);
  }

  @Mutation(() => Boolean)
  deleteDevice(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @CurrentRoomId() roomId: string,
    @Args('id') id: string,
  ) {
    return this.devicesService.remove(user.userId, homeId, roomId, id);
  }
}