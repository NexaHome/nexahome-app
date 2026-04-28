import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDeviceInput {
  @Field()
  name!: string;

  @Field()
  type!: string;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  antares_device_name?: string;
}