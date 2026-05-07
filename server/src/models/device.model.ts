import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { Room } from './room.model';
import { DeviceAutomation } from './device-automation.model';
import { LogDevice } from './log.model';

@ObjectType()
export class Device extends Model {
  static collectionName = 'devices';

  @Field(() => ID)
  _id?: string;

  @Field(() => ID)
  room_id!: ObjectId; // references rooms.id

  @Field()
  name!: string;

  @Field()
  type!: string;

  @Field()
  status!: string;

  @Field(() => Boolean, { nullable: true })
  is_active?: boolean;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  antares_device_name?: string;

  @Field(() => String, { nullable: true })
  last_value?: any;

  @Field()
  createdAt!: Date;

  public room() {
    return this.belongsTo(Room);
  }

  public deviceAutomation() {
    return this.hasMany(DeviceAutomation);
  }

  public logs() {
    return this.hasMany(LogDevice);
  }
}
