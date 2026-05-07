import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdatePushTokenInput {
  @Field()
  token!: string;
}
