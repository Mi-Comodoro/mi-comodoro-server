import { INestApplication } from '@nestjs/common';

export const setupApp = (app: INestApplication) => {
  app.enableCors();
  app.setGlobalPrefix('api/v1');
};
