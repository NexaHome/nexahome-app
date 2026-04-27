import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateLogDeviceInput {
  @Field()
  deviceId!: string;

  @Field()
  value!: string;
}