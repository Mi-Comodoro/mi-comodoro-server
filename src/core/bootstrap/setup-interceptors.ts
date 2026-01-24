import { INestApplication } from '@nestjs/common';

import { LoggingInterceptor, ResponseInterceptor } from '../interceptors';
import { LoggerProviderService } from '../providers/logs';

export const setupGlobalInterceptors = (app: INestApplication) => {
  const logger = app.get(LoggerProviderService);
  app.useGlobalInterceptors(new ResponseInterceptor(logger));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
};
