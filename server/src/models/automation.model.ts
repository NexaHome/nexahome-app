import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DeviceAutomation } from './device-automation.model';
import { User } from './user.model';

@ObjectType()
export class Automation extends Model {
  static collectionName = 'automations';

  @Field(() => ID)
  _id?: string;

  @Field()
  user_id!: string; // references users.id

  @Field()
  name!: string;

  @Field()
  trigger!: string;

  @Field()
  action!: string;

  @Field()
  createdAt!: Date;

  public deviceAutomations() {
    return this.hasMany(DeviceAutomation);
  }

  public user() {
    return this.belongsTo(User);
  }
}
