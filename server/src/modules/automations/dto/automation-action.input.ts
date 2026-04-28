import { Field, InputType } from '@nestjs/graphql';
import { AutomationCommand } from './automation.enums';

@InputType()
export class AutomationActionInput {
  @Field(() => AutomationCommand, {
    description: 'Perintah yang akan dijalankan oleh automation.',
  })
  command!: AutomationCommand;

  @Field({
    nullable: true,
    description: 'Opsional. Hanya dipakai oleh action tertentu seperti setAwayMode.',
  })
  enabled?: boolean;
}