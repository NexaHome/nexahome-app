import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class AppService implements OnModuleDestroy {
  private redisClient?: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getRedisHealth() {
    const redisUrl =
      this.configService.get<string>('REDIS_URI') ||
      this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return {
        ok: false,
        message: 'REDIS_URI/REDIS_URL is not configured',
      };
    }

    try {
      if (!this.redisClient) {
        this.redisClient = createClient({ url: redisUrl });
        this.redisClient.on('error', () => {
          // keep silent; health endpoint reports status via ping
        });
      }

      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }

      const pingResult = await this.redisClient.ping();

      return {
        ok: pingResult === 'PONG',
        message: pingResult,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }

  async onModuleDestroy() {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit();
    }
  }
}
