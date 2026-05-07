import { Model } from 'mongoloquent';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { User } from './user.model';
import { HomeUser } from './home-user.model';
import { Room } from './room.model';

@ObjectType()
export class Home extends Model {
  static collectionName = 'homes';

  @Field(() => ID)
  _id?: string;

  @Field()
  name!: string;

  @Field(() => ID)
  owner_id!: ObjectId; // references users.id

  @Field({ nullable: true })
  invite_code?: string;

  @Field({ nullable: true, defaultValue: false })
  is_away_mode?: boolean;

  @Field()
  createdAt!: Date;

  public homeUser() {
    return this.hasMany(HomeUser);
  }

  public rooms(){
    return this.hasMany(Room);
  }

}
