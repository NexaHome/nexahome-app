import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Automation } from '../../models/automation.model';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentHomeId } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateAutomationInput } from './dto/create-automation.input';
import { UpdateAutomationInput } from './dto/update-automation.input';
import { AutomationsService } from './automations.service';
import { AutomationJobResult } from './dto/automation-job-result.type';
import { AutomationQueueService } from './automation-queue.service';

@Resolver(() => Automation)
@UseGuards(GqlAuthGuard)
export class AutomationsResolver {
  constructor(
    private readonly automationsService: AutomationsService,
    private readonly automationQueueService: AutomationQueueService,
  ) {}

  @Mutation(() => Automation)
  createAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Args('createAutomationInput') createAutomationInput: CreateAutomationInput,
    @CurrentHomeId() homeId?: string,
  ) {
    return this.automationsService.create(user.userId, createAutomationInput, homeId);
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
    @CurrentHomeId() homeId?: string,
  ) {
    return this.automationsService.update(user.userId, id, updateAutomationInput, homeId);
  }

  @Mutation(() => Boolean)
  deleteAutomation(@CurrentUser() user: AuthenticatedUser, @Args('id') id: string) {
    return this.automationsService.remove(user.userId, id);
  }

  @Mutation(() => AutomationJobResult)
  queueAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Args('id') id: string,
    @Args('delayMs', { nullable: true }) delayMs?: number,
  ) {
    return this.automationsService
      .findOneByUser(id, user.userId)
      .then(() => this.automationQueueService.enqueueAutomation(id, delayMs ?? 0));
  }
}