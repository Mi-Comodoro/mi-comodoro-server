import { INestApplication } from '@nestjs/common';

import filters from '../filters';
const { GlobalHttpExceptionFilter } = filters;

export const setupGlobalFilters = (app: INestApplication) => {
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
};
