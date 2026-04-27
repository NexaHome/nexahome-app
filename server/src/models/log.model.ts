import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Device } from './device.model';

@ObjectType()
export class LogDevice extends Model {
  static collectionName = 'logs';

  @Field(() => ID)
  _id?: string;

  @Field()
  device_id!: string; // references devices.id

  @Field()
  value!: string;

  @Field()
  createdAt!: Date;

  public device() {
    return this.belongsTo(Device);
  }
}
