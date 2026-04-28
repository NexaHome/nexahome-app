import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Home } from '../../models/home.model';
import { HomesService } from './homes.service';
import { CreateHomeInput } from './dto/create-home.input';
import { UpdateHomeInput } from './dto/update-home.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, CurrentHomeId } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DashboardHome } from './dto/dashboard-home.type';
import { RoomSummary } from './dto/room-summary.type';
import { QuickActionResult } from './dto/quick-action-result.type';
import { AddHomeMemberInput } from './dto/add-home-member.input';
import { HomeMember } from './dto/home-member.type';
import { HomeUser } from '../../models/home-user.model';

@Resolver(() => Home)
@UseGuards(GqlAuthGuard)
export class HomesResolver {
  constructor(private readonly homesService: HomesService) {}

  @Mutation(() => Home)
  createHome(
    @CurrentUser() user: AuthenticatedUser,
    @Args('createHomeInput') createHomeInput: CreateHomeInput,
  ) {
    return this.homesService.create(user.userId, createHomeInput);
  }

  @Query(() => [Home], { name: 'homes' })
  findAllHomesByOwner(@CurrentUser() user: AuthenticatedUser) {
    return this.homesService.findAllByMember(user.userId);
  }


  @Query(() => Home, { name: 'home' })
  findHomeById(@CurrentUser() user: AuthenticatedUser, @CurrentHomeId() homeId: string) {
    return this.homesService.findOneByMember(homeId, user.userId);
  }
  @Mutation(() => Home)
  updateHome(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('updateHomeInput') updateHomeInput: UpdateHomeInput,
  ) {
    return this.homesService.update(id, user.userId, updateHomeInput);
  }

  @Mutation(() => Boolean)
  deleteHome(@CurrentUser() user: AuthenticatedUser, @Args('id') id: string) {
    return this.homesService.remove(id, user.userId);
  }

  @Query(() => DashboardHome)
  dashboardHome(
    @CurrentUser() user: AuthenticatedUser,
    @Args('homeId', { nullable: true }) homeId?: string,
  ) {
    return this.homesService.getDashboard(user.userId, homeId);
  }


  @Query(() => [RoomSummary])
  roomsByHome(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
  ) {
    return this.homesService.getRoomSummaries(user.userId, homeId);
  }
  @Mutation(() => QuickActionResult)
  allDevicesOn(@CurrentUser() user: AuthenticatedUser, @Args('homeId') homeId: string) {
    return this.homesService.allDevicesOn(user.userId, homeId);
  }

  @Mutation(() => QuickActionResult)
  allDevicesOff(@CurrentUser() user: AuthenticatedUser, @Args('homeId') homeId: string) {
    return this.homesService.allDevicesOff(user.userId, homeId);
  }

  @Mutation(() => QuickActionResult)
  setAwayMode(
    @CurrentUser() user: AuthenticatedUser,
    @Args('homeId') homeId: string,
    @Args('enabled') enabled: boolean,
  ) {
    return this.homesService.setAwayMode(user.userId, homeId, enabled);
  }

  @Mutation(() => HomeUser)
  addHomeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Args('homeId') homeId: string,
    @Args('addHomeMemberInput') addHomeMemberInput: AddHomeMemberInput,
  ) {
    return this.homesService.addMember(homeId, user.userId, addHomeMemberInput);
  }

  @Query(() => [HomeMember])
  membersByHome(@CurrentUser() user: AuthenticatedUser, @Args('homeId') homeId: string) {
    return this.homesService.getMembers(homeId, user.userId);
  }
}
