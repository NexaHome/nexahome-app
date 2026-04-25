import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DashboardHome {
  @Field()
  homeId: string;

  @Field()
  homeName: string;

  @Field()
  homeStatus: string;

  @Field(() => Int)
  roomsCount: number;

  @Field(() => Int)
  activeDevicesCount: number;
}
