import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { User } from './user.model';
import { Room } from './room.model';
import { Home } from './home.model';

@ObjectType()
export class HomeUser extends Model {
  static collectionName = 'home_users';

  @Field(() => ID)
  _id?: string;

  @Field()
  user_id!: string; // references users.id

  @Field()
  home_id!: string; // references homes.id

  @Field()
  createdAt!: Date;

  public user() {
      return this.belongsTo(User);
    }

  public homes(){
    return this.belongsTo(Home);
  }
}
