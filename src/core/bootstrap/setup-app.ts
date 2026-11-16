import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

import { corsOriginResolver } from '../config/security/allowed-origins';

export const setupApp = (app: INestApplication) => {
  app.use(helmet());

  app.enableCors({
    origin: corsOriginResolver,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');
};
