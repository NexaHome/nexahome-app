import { Module } from '@nestjs/common';
import { AntaresService } from './antares.service';
import { AntaresResolver } from './antares.resolver';
import { ConfigModule } from '@nestjs/config';
import { LogDeviceModule } from '../log-device/log-device.module';

@Module({
  imports: [ConfigModule, LogDeviceModule],
  providers: [AntaresService, AntaresResolver],
  exports: [AntaresService],
})
export class AntaresModule {}
