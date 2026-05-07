import { Field, InputType } from '@nestjs/graphql';
import { AutomationActionInput } from './automation-action.input';
import { AutomationTriggerInput } from './automation-trigger.input';

@InputType()
export class UpdateAutomationInput {
  @Field({ nullable: true, description: 'Nama automation baru, jika ingin diganti.' })
  name?: string;

  @Field(() => AutomationTriggerInput, {
    nullable: true,
    description: 'Trigger baru dalam bentuk terstruktur.',
  })
  trigger?: AutomationTriggerInput;

  @Field(() => AutomationActionInput, {
    nullable: true,
    description: 'Action baru dalam bentuk terstruktur.',
  })
  action?: AutomationActionInput;
}