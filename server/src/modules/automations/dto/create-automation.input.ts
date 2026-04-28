import { Field, InputType } from '@nestjs/graphql';
import { AutomationActionInput } from './automation-action.input';
import { AutomationTriggerInput } from './automation-trigger.input';

@InputType()
export class CreateAutomationInput {
  @Field({ description: 'Nama automation yang akan ditampilkan di app.' })
  name!: string;

  @Field(() => AutomationTriggerInput, {
    description: 'Trigger automation dalam bentuk terstruktur.',
  })
  trigger!: AutomationTriggerInput;

  @Field(() => AutomationActionInput, {
    description: 'Action automation dalam bentuk terstruktur.',
  })
  action!: AutomationActionInput;
}