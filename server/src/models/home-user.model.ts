import { Model } from 'mongoloquent';

export class HomeUser extends Model {
  static collectionName = 'home_users';

  user_id: string; // references users.id

  home_id: string; // references homes.id

  role: string;

  createdAt: Date;
}
