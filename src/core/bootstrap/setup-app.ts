import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export const setupApp = (app: INestApplication) => {
  app.use(helmet());

  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local';

  app.enableCors({
    origin: isDev ? true : ['https://app.micomodoro.com', 'https://micomodoro.com'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');
};
