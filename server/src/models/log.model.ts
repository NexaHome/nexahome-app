import { Model } from 'mongoloquent';

export class Log extends Model {
  static collectionName = 'logs';

  device_id: string; // references devices.id

  value: string;

  createdAt: Date;
}
