import { Model } from 'mongoloquent';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class User extends Model {
  static collectionName = 'users';

  @Field(() => ID)
  _id?: string;

  @Field()
  name: string;

  @Field()
  email: string;

  password?: string; // Not exposed to GraphQL

  @Field()
  createdAt: Date;
}
