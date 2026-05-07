import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateRoomInput {
  @Field({ nullable: true })
  name?: string;
}
