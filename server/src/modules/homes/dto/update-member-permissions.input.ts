import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateMemberPermissionsInput {
  @Field()
  can_control_devices!: boolean;

  @Field()
  can_manage_schedules!: boolean;

  @Field()
  can_invite_members!: boolean;
}
