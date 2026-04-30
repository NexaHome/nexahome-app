import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { LogDeviceService } from './log-device.service';

@Controller('webhook/antares')
export class LogDeviceController {
  constructor(private readonly logDeviceService: LogDeviceService) {}

  @Post(['', ':antaresDeviceName'])
  @HttpCode(HttpStatus.OK)
  async handleAntaresWebhook(@Param('antaresDeviceName') paramDeviceName: string, @Body() body: any) {
    let antaresDeviceName = paramDeviceName;
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

      // If device name not in URL, try to extract from payload
      if (!antaresDeviceName) {
        if (value && typeof value === 'object') {
          // Check for 'sensor' first, then 'device', 'device_name', etc.
          // If they pass 'sensor-Rain', but 'sensor': 'Rain', the 'sensor' key will match the DB directly.
          // Check for 'target' first (common for commands), then 'sensor', 'device', etc.
          antaresDeviceName = value.target || value.sensor || value.device || value.device_name || value.name || value.id;
          
          // Fallback: If device name starts with 'sensor-', strip it out
          // e.g. 'sensor-Rain' -> 'Rain'
          if (antaresDeviceName && typeof antaresDeviceName === 'string' && antaresDeviceName.toLowerCase().startsWith('sensor-')) {
            antaresDeviceName = antaresDeviceName.substring(7); // remove 'sensor-'
          }
        }

        // Try to extract from Antares subscription URI
        // e.g., /antares-cse/v2x/.../AppName/DeviceName/SubName
        if (!antaresDeviceName) {
          const sur = body?.['m2m:sgn']?.sur || body?.['m2m:sgn']?.['m2m:sur'];
          if (sur && typeof sur === 'string') {
            const parts = sur.split('/');
            if (parts.length >= 3) {
              antaresDeviceName = parts[parts.length - 2];
            }
          }
        }
      }

      if (!antaresDeviceName) {
        console.error(`[Webhook] Could not determine device name from webhook payload.`);
        return { status: 'error', message: 'Missing device name in URL or payload' };
      }

      await this.logDeviceService.createFromWebhook(antaresDeviceName, value);
      
      console.log(`[Webhook] Success saving log for device ${antaresDeviceName}`);
      return { status: 'success' };
    } catch (error) {
      console.error(`[Webhook] Error saving log for device '${antaresDeviceName}':`, error.message);
      if (error.message === 'Device not found') {
          console.error(`[Webhook] Device '${antaresDeviceName}' was extracted but NOT FOUND in MongoDB.`);
          console.error(`[Webhook] Please check if the name matches the 'antares_device_name' exactly.`);
      }
      // We still return 200 OK so Antares doesn't consider it a failure and stop sending webhooks
      return { status: 'error', message: error.message };
    }
  }
}
