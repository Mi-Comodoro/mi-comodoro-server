import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { InitialConfigModule } from '@/core/config/index';
import { DatabaseModule } from '@/core/modules/database/postgres.module';
import { LoggerProviderModule } from '@/core/providers/logs';

import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    InitialConfigModule,
    ApiModule,
    LoggerProviderModule,
    DatabaseModule,
  ],
})
export class AppModule {}
