import { Model } from 'mongoloquent';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from './user.model';

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

  public user() {
    return this.belongsTo(User);
  }
}
