import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HomeMember {
  @Field()
  userId!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  can_control_devices!: boolean;

  @Field()
  can_manage_schedules!: boolean;

  @Field()
  can_invite_members!: boolean;
}
