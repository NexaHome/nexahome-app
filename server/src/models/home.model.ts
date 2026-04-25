import { Model } from 'mongoloquent';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Home extends Model {
  static collectionName = 'homes';

  @Field(() => ID)
  _id?: string;

  @Field()
  name!: string;

  @Field()
  owner_id!: string; // references users.id

  @Field()
  createdAt!: Date;
}
