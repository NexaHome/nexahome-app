import { Model } from 'mongoloquent';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Automation } from './automation.model';
import { HomeUser } from './home-user.model';

@ObjectType()
export class User extends Model {
  static collectionName = 'users';

  @Field(() => ID)
  _id?: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  password?: string; // Not exposed to GraphQL

  @Field()
  createdAt!: Date;

  public homeUser() {
    return this.hasMany(HomeUser);
  }

  public automations() {
    return this.hasMany(Automation);
  }
}
