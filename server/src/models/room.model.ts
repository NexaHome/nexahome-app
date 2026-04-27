import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { HomeUser } from './home-user.model';
import { Device } from './device.model';
import { Home } from './home.model';

@ObjectType()
export class Room extends Model {
  static collectionName = 'rooms';

  @Field(() => ID)
  _id?: string;

  @Field(() => ID)
  home_id!: ObjectId; // references homes.id

  @Field()
  name!: string;

  @Field()
  createdAt!: Date;

  public home() {
        return this.belongsTo(Home);
      }

  public devices() {
        return this.hasMany(Device);
      }
}
