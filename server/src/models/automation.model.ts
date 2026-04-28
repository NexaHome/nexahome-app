import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { DeviceAutomation } from './device-automation.model';
import { User } from './user.model';

@ObjectType()
export class Automation extends Model {
  static collectionName = 'automations';

  @Field(() => ID)
  _id?: string;

  @Field(() => ID)
  user_id!: ObjectId; // references users.id

  @Field()
  name!: string;

  @Field()
  trigger!: string;

  @Field()
  action!: string;

  @Field({ defaultValue: true })
  is_active!: boolean;

  @Field({ nullable: true })
  queuedAt?: Date;

  @Field({ nullable: true })
  lastExecutedAt?: Date;

  @Field()
  createdAt!: Date;

  public deviceAutomations() {
    return this.hasMany(DeviceAutomation);
  }

  public user() {
    return this.belongsTo(User);
  }
}
