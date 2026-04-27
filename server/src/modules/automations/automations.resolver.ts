import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Automation } from '../../models/automation.model';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateAutomationInput } from './dto/create-automation.input';
import { UpdateAutomationInput } from './dto/update-automation.input';
import { AutomationsService } from './automations.service';

@Resolver(() => Automation)
@UseGuards(GqlAuthGuard)
export class AutomationsResolver {
  constructor(private readonly automationsService: AutomationsService) {}

  @Mutation(() => Automation)
  createAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Args('createAutomationInput') createAutomationInput: CreateAutomationInput,
  ) {
    return this.automationsService.create(user.userId, createAutomationInput);
  }

  @Query(() => [Automation], { name: 'automations' })
  findAllAutomations(@CurrentUser() user: AuthenticatedUser) {
    return this.automationsService.findAllByUser(user.userId);
  }

  @Query(() => Automation, { name: 'automation' })
  findAutomationById(@CurrentUser() user: AuthenticatedUser, @Args('id') id: string) {
    return this.automationsService.findOneByUser(id, user.userId);
  }

  @Mutation(() => Automation)
  updateAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('updateAutomationInput') updateAutomationInput: UpdateAutomationInput,
  ) {
    return this.automationsService.update(user.userId, id, updateAutomationInput);
  }

  @Mutation(() => Boolean)
  deleteAutomation(@CurrentUser() user: AuthenticatedUser, @Args('id') id: string) {
    return this.automationsService.remove(user.userId, id);
  }
}