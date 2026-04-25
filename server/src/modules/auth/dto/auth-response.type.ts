import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field()
  userId: string;

  @Field()
  email: string;

  @Field()
  name: string;
}
