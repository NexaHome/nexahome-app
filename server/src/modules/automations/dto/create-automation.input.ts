import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateAutomationInput {
  @Field()
  name!: string;

  @Field()
  trigger!: string;

  @Field()
  action!: string;
}