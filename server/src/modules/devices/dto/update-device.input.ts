import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateDeviceInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  type?: string;

  @Field({ nullable: true })
  status?: string;
}