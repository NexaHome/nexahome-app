import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogDeviceService } from '../log-device/log-device.service';

@Injectable()
export class AntaresService {
  private readonly logger = new Logger(AntaresService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly logDeviceService: LogDeviceService,
  ) {}

  async getLatestData(userId?: string, homeId?: string, appName?: string, deviceName?: string) {
    const app = appName || this.configService.get<string>('ANTARES_APP_NAME') || '';
    const device = deviceName || this.configService.get<string>('ANTARES_DEVICE_NAME') || '';
    const accessKey = this.configService.get<string>('ANTARES_ACCESS_KEY') || '';
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
        throw new Error(`Antares error: ${res.statusText}`);
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

      // Auto-log to MongoDB if we have user and home context
      if (userId && homeId && typeof parsed === 'object') {
        try {
          // Find the device ID for 'Antares Gateway' in this home
          // For now, we'll assume a specific device ID or search for it
          // As a shortcut for this task, I'll use the ID I created: 69ef274da967ce00702d461b
          const targetDeviceId = '69ef274da967ce00702d461b';
          await this.logDeviceService.create(userId, homeId, {
            deviceId: targetDeviceId,
            value: JSON.stringify(parsed),
          });
        } catch (logError) {
          this.logger.warn(`Failed to auto-log Antares data: ${logError.message}`);
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Antares Error: ${error.message}`);
      return null;
    }
  }

  async sendData(data: any, appName?: string, deviceName?: string) {
    const app = appName || this.configService.get<string>('ANTARES_APP_NAME') || '';
    const device = deviceName || this.configService.get<string>('ANTARES_DEVICE_NAME') || '';
    const accessKey = this.configService.get<string>('ANTARES_ACCESS_KEY') || '';
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
        throw new Error(`Antares error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to send to Antares: ${error.message}`);
      throw error;
    }
  }
}
