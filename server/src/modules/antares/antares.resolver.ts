import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { AntaresService } from './antares.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentHomeId, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Resolver()
export class AntaresResolver {
  constructor(private readonly antaresService: AntaresService) {}

  @Query(() => String, { name: 'getAntaresLatestData' })
  @UseGuards(GqlAuthGuard)
  async getLatestData(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentHomeId() homeId: string,
    @Args('appName', { nullable: true }) appName?: string,
    @Args('deviceName', { nullable: true }) deviceName?: string,
  ) {
    const data = await this.antaresService.getLatestData(user.userId, homeId, appName, deviceName);
    return typeof data === 'object' ? JSON.stringify(data) : String(data);
  }

  @Mutation(() => String, { name: 'sendAntaresData' })
  @UseGuards(GqlAuthGuard)
  async sendData(
    @Args('data') data: string,
    @Args('appName', { nullable: true }) appName?: string,
    @Args('deviceName', { nullable: true }) deviceName?: string,
  ) {
    let payload = data;
    try {
      payload = JSON.parse(data);
    } catch {
      // Keep as string if not JSON
    }

    const result = await this.antaresService.sendData(payload, appName, deviceName);
    return JSON.stringify(result);
  }
}
