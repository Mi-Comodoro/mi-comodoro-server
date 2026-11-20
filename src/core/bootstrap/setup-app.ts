import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

import { corsOriginResolver } from '../config/security/allowed-origins';

export const parseTrustProxy = (value?: string): boolean | number | string => {
  const raw = value?.trim();
  if (!raw) return 'loopback';
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
};

export const setupApp = (app: INestApplication) => {
  app.use(helmet());

  app.enableCors({
    origin: corsOriginResolver,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Detrás de un proxy, req.ip debe ser la IP real y no la del proxy. Por defecto solo se confía en
  // el loopback (BFF/Nginx en la misma máquina); TRUST_PROXY admite un número de saltos, 'true' o una
  // lista de IPs/subredes separadas por coma, como en Express.
  app.getHttpAdapter().getInstance().set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

  app.setGlobalPrefix('api/v1');
};
