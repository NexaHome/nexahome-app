import { Field, InputType, Int } from '@nestjs/graphql';
import { AutomationTriggerType } from './automation.enums';

@InputType()
export class AutomationTriggerInput {
  @Field(() => AutomationTriggerType, {
    description: 'Jenis trigger automation: delay atau schedule.',
  })
  type!: AutomationTriggerType;

  @Field(() => Int, {
    nullable: true,
    description: 'Delay dalam milidetik. Wajib untuk trigger type delay.',
  })
  delayMs?: number;

  @Field({
    nullable: true,
    description: 'Waktu eksekusi ISO string. Wajib untuk trigger type schedule.',
  })
  runAt?: string;
}