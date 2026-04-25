import { Model } from 'mongoloquent';

export class Room extends Model {
  static collectionName = 'rooms';

  home_id: string; // references homes.id

  name: string;

  createdAt: Date;
}
