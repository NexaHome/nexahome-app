import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { Device } from './device.model';
import { Automation } from './automation.model';

@ObjectType()
export class DeviceAutomation extends Model {
  static collectionName = 'device_automations';

  @Field(() => ID)
  _id?: string;

  @Field(() => ID)
  device_id!: ObjectId; // references devices.id

  @Field(() => ID)
  automation_id!: ObjectId; // references automations.id

  @Field()
  createdAt!: Date;

  public device() {
    return this.belongsTo(Device);
  }

  public automation() {
    return this.belongsTo(Automation);
  }
}
