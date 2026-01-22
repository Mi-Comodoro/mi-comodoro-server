import { INestApplication } from '@nestjs/common';
import { ResponseInterceptor, LoggingInterceptor } from '../interceptors';
import { LoggerProviderService } from '../providers/logger';

export const setupGlobalInterceptors = (app: INestApplication) => {
  const logger = app.get(LoggerProviderService);
  app.useGlobalInterceptors(new ResponseInterceptor(logger));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
};
