import { Global, Module } from '@nestjs/common';
import { LoggerProviderService } from './logger.provider.service';
@Global()
@Module({
  providers: [LoggerProviderService],
  exports: [LoggerProviderService],
})
export class LoggerProviderModule {}
