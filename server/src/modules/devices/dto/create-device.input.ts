import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDeviceInput {
  @Field()
  name!: string;

  @Field()
  type!: string;

  @Field({ nullable: true })
  status?: string;
}