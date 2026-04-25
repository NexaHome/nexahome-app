import { Model } from 'mongoloquent';

export class Device extends Model {
  static collectionName = 'devices';

  room_id: string; // references rooms.id

  name: string;

  type: string;

  status: string;

  createdAt: Date;
}
