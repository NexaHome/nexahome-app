import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { HomesModule } from './modules/homes';
import { RoomsModule } from './modules/rooms';
import { DevicesModule } from './modules/devices';
import { AutomationsModule } from './modules/automations';
import { DeviceAutomationsModule } from './modules/device-automations';
import { LogDeviceModule } from './modules/log-device';
import { AntaresModule } from './modules/antares/antares.module';
import { formatGraphQLError } from './common/errors/graphql-error.formatter';

import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: false,
      context: ({ req }) => ({
        req,
        homeId: req.headers['x-home-id'],
        roomId: req.headers['x-room-id'],
      }),
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      formatError: formatGraphQLError,
    }),
    MongoloquentModule.forRootAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: configService.get<string>('MONGOLOQUENT_DATABASE_URI')!,
        database: configService.get<string>('MONGOLOQUENT_DATABASE_NAME')!,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    HomesModule,
    RoomsModule,
    DevicesModule,
    AutomationsModule,
    DeviceAutomationsModule,
    LogDeviceModule,
    AntaresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
