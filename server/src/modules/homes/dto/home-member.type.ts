import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HomeMember {
  @Field()
  userId!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;
}
