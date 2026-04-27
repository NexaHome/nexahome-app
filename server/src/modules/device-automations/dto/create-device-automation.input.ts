import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDeviceAutomationInput {
  @Field()
  automationId!: string;
}