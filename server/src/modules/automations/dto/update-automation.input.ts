import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateAutomationInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  trigger?: string;

  @Field({ nullable: true })
  action?: string;
}