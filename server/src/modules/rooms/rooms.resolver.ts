import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Room } from '../../models/room.model';
import { RoomsService } from './rooms.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, CurrentHomeId } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateRoomInput } from './dto/create-room.input';
import { UpdateRoomInput } from './dto/update-room.input';

@Resolver(() => Room)
@UseGuards(GqlAuthGuard)
export class RoomsResolver {
  constructor(private readonly roomsService: RoomsService) {}

  @Mutation(() => Room)
  createRoom(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @Args('createRoomInput') createRoomInput: CreateRoomInput,
  ) {
    return this.roomsService.create(user.userId, homeId, createRoomInput.name);
  }

  @Query(() => [Room], { name: 'roomsByHome' })
  findRoomsByHome(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
  ) {
    return this.roomsService.findAllByHome(homeId, user.userId);
  }

  @Query(() => Room, { name: 'room' })
  findRoomById(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ) {
    return this.roomsService.findOneByMember(id, user.userId);
  }

  @Mutation(() => Room)
  updateRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('updateRoomInput') updateRoomInput: UpdateRoomInput,
  ) {
    return this.roomsService.update(user.userId, id, updateRoomInput);
  }

  @Mutation(() => Boolean)
  deleteRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
  ) {
    return this.roomsService.remove(user.userId, id);
  }
}
