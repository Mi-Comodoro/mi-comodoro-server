import { INestApplication } from '@nestjs/common';

import filters from '../filters';
import { LoggerProviderService } from '../providers';
const { GlobalHttpExceptionFilter } = filters;

export const setupGlobalFilters = (app: INestApplication) => {
  const logger = app.get(LoggerProviderService);
  app.useGlobalFilters(new GlobalHttpExceptionFilter(logger));
};
