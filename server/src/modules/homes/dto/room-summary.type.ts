import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RoomSummary {
  @Field()
  roomId: string;

  @Field()
  name: string;

  @Field(() => Int)
  activeDevices: number;

  @Field(() => Int)
  totalDevices: number;

  @Field()
  subtitle: string;
}
