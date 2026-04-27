import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { LogDeviceService } from './log-device.service';

@Controller('webhook/antares')
export class LogDeviceController {
  constructor(private readonly logDeviceService: LogDeviceService) {}

  @Post(':deviceId')
  @HttpCode(HttpStatus.OK)
  async handleAntaresWebhook(@Param('deviceId') deviceId: string, @Body() body: any) {
    try {
      // Antares payload structure typically puts the actual data in m2m:sgn.m2m:nev.m2m:rep.m2m:cin.con
      let value: any = '';
      
      const cin = body?.['m2m:sgn']?.['m2m:nev']?.['m2m:rep']?.['m2m:cin'];
      if (cin && cin.con !== undefined) {
        // Data from Antares is found
        if (typeof cin.con === 'string') {
          try {
            value = JSON.parse(cin.con);
          } catch {
            value = cin.con;
          }
        } else {
          value = cin.con;
        }
      } else {
        // Fallback if the structure is different
        value = body;
      }

      await this.logDeviceService.createFromWebhook(deviceId, value);
      
      console.log(`[Webhook] Success saving log for device ${deviceId}`);
      return { status: 'success' };
    } catch (error) {
      console.error(`[Webhook] Error saving log for device ${deviceId}:`, error.message);
      // We still return 200 OK so Antares doesn't consider it a failure and stop sending webhooks
      return { status: 'error', message: error.message };
    }
  }
}
