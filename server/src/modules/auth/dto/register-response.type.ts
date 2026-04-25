import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class RegisterResponse {
  @Field(() => ID)
  userId: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field()
  message: string;
}
