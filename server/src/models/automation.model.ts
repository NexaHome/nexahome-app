import { Model } from 'mongoloquent';

export class Automation extends Model {
  static collectionName = 'automations';

  user_id: string; // references users.id

  name: string;

  trigger: string;

  action: string;

  createdAt: Date;
}
