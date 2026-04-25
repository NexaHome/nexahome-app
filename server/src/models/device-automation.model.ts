import { Model } from 'mongoloquent';

export class DeviceAutomation extends Model {
  static collectionName = 'device_automations';

  device_id: string; // references devices.id

  automation_id: string; // references automations.id

  createdAt: Date;
}
