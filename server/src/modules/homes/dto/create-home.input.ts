import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateHomeInput {
  @Field()
  name!: string;
}
