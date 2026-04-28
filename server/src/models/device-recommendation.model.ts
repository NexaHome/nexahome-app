import { Model } from 'mongoloquent';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { Device } from './device.model';

@ObjectType()
export class SuggestedAction {
  @Field()
  actionType!: string;

  @Field(() => String, { nullable: true })
  params?: any;
}

@ObjectType()
export class DeviceRecommendation extends Model {
  static collectionName = 'device_recommendations';

  @Field(() => ID)
  _id?: string;

  @Field(() => ID)
  device_id!: ObjectId; // references devices.id

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [SuggestedAction], { nullable: true })
  suggestedActions?: SuggestedAction[];

  @Field(() => Number, { nullable: true })
  confidence?: number;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => String, { nullable: true })
  conditions?: any;

  @Field({ nullable: true })
  source?: string;

  @Field()
  createdAt!: Date;

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;

  public device() {
    return this.belongsTo(Device);
  }
}
