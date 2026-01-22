import { Module } from '@nestjs/common';

import { HealthController } from './infrastructure/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class HealthModule {}
