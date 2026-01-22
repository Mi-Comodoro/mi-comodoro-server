import { InitialConfigModule } from '@/core/config/index';
import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { LoggerProviderModule } from '@/core/providers/logger';

@Module({
  imports: [InitialConfigModule, ApiModule, LoggerProviderModule],
})
export class AppModule {}
