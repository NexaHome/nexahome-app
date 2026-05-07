import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DashboardHome {
  @Field()
  homeId: string;

  @Field()
  homeName: string;

  @Field()
  homeStatus: string;

  @Field(() => Boolean)
  is_away_mode: boolean;

  @Field(() => Int)
  roomsCount: number;

  @Field(() => Int)
  activeDevicesCount: number;
}
