import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { Device } from './device.model';

@ObjectType()
export class LogDevice extends Model {
  static collectionName = 'logs';

  @Field(() => ID)
  _id?: string;

  @Field(() => ID)
  device_id!: ObjectId; // references devices.id

  @Field(() => String)
  value!: any;

  @Field()
  createdAt!: Date;

  public device() {
    return this.belongsTo(Device);
  }
}
