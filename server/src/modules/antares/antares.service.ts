import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogDeviceService } from '../log-device/log-device.service';
import { Room } from '../../models/room.model';
import { Device } from '../../models/device.model';
import { toObjectId } from '../../common/utils/object-id.util';

@Injectable()
export class AntaresService {
  private readonly logger = new Logger(AntaresService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly logDeviceService: LogDeviceService,
  ) {}

  async getLatestData(userId?: string, homeId?: string, appName?: string, deviceName?: string) {
    const app = appName || this.configService.get<string>('ANTARES_APP_NAME') || '';
    const accessKey = this.configService.get<string>('ANTARES_ACCESS_KEY') || '';

    // Jika deviceName diberikan spesifik, fetch data device tersebut
    if (deviceName) {
      return this.fetchFromAntares(app, deviceName, accessKey, userId, homeId);
    }

    if (!homeId) return null;

    const rooms = await Room.where('home_id', toObjectId(homeId)).get();
    if (!rooms.length) return null;

    const devicesData: any = {};
    const fetchPromises: Promise<void>[] = [];

    for (const room of rooms) {
      const devices = await Device.where('room_id', room._id).get();
      for (const device of devices) {
        if (!device.antares_device_name) continue;
        
        fetchPromises.push(
          this.fetchFromAntares(app, device.antares_device_name, accessKey, userId, homeId, device._id?.toString())
            .then(async (parsed) => {
              if (parsed) {
                const category = device.category?.toLowerCase() || 'unknown';
                devicesData[category] = parsed;
                // Update last_value pada device
                await Device.where('_id', device._id).update({ last_value: parsed });
              }
            })
        );
      }
    }

    await Promise.all(fetchPromises);

    if (Object.keys(devicesData).length === 0) {
      return null;
    }

    return { sensors: devicesData };
  }

  private async fetchFromAntares(app: string, device: string, accessKey: string, userId?: string, homeId?: string, deviceId?: string) {
    const url = `https://platform.antares.id:8443/~/antares-cse/antares-id/${app}/${device}/la`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-M2M-Origin': accessKey,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        this.logger.warn(`Antares error for ${device}: ${res.statusText}`);
        return null;
      }

      const json = await res.json();
      const raw = json['m2m:cin']?.con;

      if (!raw) return null;

      let parsed = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Keep as raw if not JSON
      }

      // Auto-log to MongoDB if we have user, home and deviceId
      if (userId && homeId && deviceId && typeof parsed === 'object') {
        try {
          await this.logDeviceService.create(userId, homeId, {
            deviceId: deviceId,
            value: JSON.stringify(parsed),
          });
        } catch (logError) {
          this.logger.warn(`Failed to auto-log Antares data: ${logError.message}`);
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Antares Error for ${device}: ${error.message}`);
      return null;
    }
  }

  async sendData(data: any, appName?: string, deviceName?: string) {
    const app = appName || this.configService.get<string>('ANTARES_APP_NAME') || '';
    const device = deviceName || this.configService.get<string>('ANTARES_DEVICE_NAME') || '';
    const accessKey = this.configService.get<string>('ANTARES_ACCESS_KEY') || '';
    
    if (!device) {
      throw new Error('Antares device name is required');
    }

    const url = `https://platform.antares.id:8443/~/antares-cse/antares-id/${app}/${device}`;

    const body = {
      'm2m:cin': {
        con: typeof data === 'string' ? data : JSON.stringify(data),
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-M2M-Origin': accessKey,
          'Content-Type': 'application/json;ty=4',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Antares error for ${device}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to send to Antares for ${device}: ${error.message}`);
      throw error;
    }
  }
}
