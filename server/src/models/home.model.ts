import { Model } from 'mongoloquent';

export class Home extends Model {
  static collectionName = 'homes';

  name: string;

  owner_id: string; // references users.id

  createdAt: Date;
}
