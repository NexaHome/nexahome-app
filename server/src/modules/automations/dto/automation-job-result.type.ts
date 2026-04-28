import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AutomationJobResult {
  @Field(() => Boolean)
  queued!: boolean;

  @Field(() => ID, { nullable: true })
  jobId?: string;

  @Field(() => ID)
  automationId!: string;

  @Field()
  message!: string;

  @Field(() => Int, { nullable: true })
  delayMs?: number;
}