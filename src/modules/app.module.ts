import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdempotencyInterceptor } from '@/common/idempotency/idempotency.interceptor';
import { IdempotencyKey } from '@/common/idempotency/idempotency-key.entity';
import { InitialConfigModule } from '@/core/config/index';
import { RolesGuard } from '@/core/config/security/guards/roles.guard';
import { DatabaseModule } from '@/core/modules/database/postgres.module';
import { LoggerProviderModule } from '@/core/providers/logs';

import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60_000,
        limit: 60,
      },
    ]),
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
    TypeOrmModule.forFeature([IdempotencyKey]),
    InitialConfigModule,
    ApiModule,
    LoggerProviderModule,
    DatabaseModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
