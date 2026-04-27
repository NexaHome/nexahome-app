import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Room } from './room.model';
import { DeviceAutomation } from './device-automation.model';
import { LogDevice } from './log.model';

@ObjectType()
export class Device extends Model {
  static collectionName = 'devices';

  @Field(() => ID)
  _id?: string;

  @Field()
  room_id!: string; // references rooms.id

  @Field()
  name!: string;

  @Field()
  type!: string;

  @Field()
  status!: string;

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
