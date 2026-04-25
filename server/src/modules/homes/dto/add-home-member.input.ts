import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddHomeMemberInput {
  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  email?: string;
}
