import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateDeviceInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  type?: string;

  @Field({ nullable: true })
  status?: string;

  @Field(() => Boolean, { nullable: true })
  is_active?: boolean;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  antares_device_name?: string;
}