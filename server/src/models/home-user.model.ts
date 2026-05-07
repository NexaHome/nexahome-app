import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { User } from './user.model';
import { Room } from './room.model';
import { Home } from './home.model';

@ObjectType()
export class HomeUser extends Model {
  static collectionName = 'homeusers';

  @Field(() => ID)
  _id?: string;

  @Field(() => ID)
  user_id!: ObjectId; // references users.id

  @Field(() => ID)
  home_id!: ObjectId; // references homes.id

  @Field({ defaultValue: true })
  can_control_devices: boolean = true;

  @Field({ defaultValue: false })
  can_manage_schedules: boolean = false;

  @Field({ defaultValue: false })
  can_invite_members: boolean = false;

  @Field()
  createdAt!: Date;

  public user() {
      return this.belongsTo(User);
    }

  public homes(){
    return this.belongsTo(Home);
  }
}
