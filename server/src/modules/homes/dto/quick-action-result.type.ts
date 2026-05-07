import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QuickActionResult {
  @Field()
  success: boolean;

  @Field(() => Int)
  affectedDevices: number;

  @Field()
  message: string;
}
