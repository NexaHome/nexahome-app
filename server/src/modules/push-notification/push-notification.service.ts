import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class PushNotificationService {
  private expo: Expo;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor() {
    this.expo = new Expo();
  }

  async sendNotification(pushTokens: string[], title: string, body: string, data?: any) {
    const messages: ExpoPushMessage[] = [];

    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        this.logger.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: any[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        this.logger.error('Error sending push notification chunk', error);
      }
    }

    return tickets;
  }
}
