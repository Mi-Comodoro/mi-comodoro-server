import { registerAs } from '@nestjs/config';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  envName: string;
  url: string;
  tag: string;
  path: string;
}

export default registerAs<SwaggerConfig>('swagger', () => ({
  title: process.env.APP_NAME ?? 'API Documentation',
  description: '',
  version: 'v1.0',
  envName: process.env.APP_ENV ?? 'development',
  url: process.env.SWAGGER_URL ?? 'http://localhost:3000/api-docs',
  tag: process.env.APP_NAME ?? 'API',
  path: 'api-docs',
}));
