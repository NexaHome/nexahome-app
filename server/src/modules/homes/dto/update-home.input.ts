import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateHomeInput {
  @Field({ nullable: true })
  name?: string;
}
