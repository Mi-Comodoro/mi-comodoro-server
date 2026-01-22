import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { DEFAULT_PORT } from './common/constants';

import { setupApp } from './core/bootstrap/setup-app';
import { setupGlobalPipes } from './core/bootstrap/setup-pipes';
import { setupGlobalFilters } from './core/bootstrap/setup-filters';
import { setupGlobalInterceptors } from './core/bootstrap/setup-interceptors';
import { setupSwagger } from './core/bootstrap/setup-swagger';

import { AppConfigService, SwaggerConfigService } from './core/config/index';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      context: 'Main',
      timestamp: true,
      logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
    }),
  });

  // 1. Settings base
  setupApp(app);

  // 2. AppConfig (una sola vez)
  const appConfig = app.get(AppConfigService);

  // 3. Swagger
  if (['local', 'development'].includes(appConfig.env)) {
    setupSwagger(app, app.get(SwaggerConfigService));
  }

  // 4. Global setup
  setupGlobalFilters(app);
  setupGlobalInterceptors(app);
  setupGlobalPipes(app);

  // 5. Listen
  const port = appConfig.port ?? DEFAULT_PORT;
  await app.listen(port);

  Logger.log(`🚀 Server running on port ${port}`);
}

bootstrap().catch((error) => {
  Logger.error('❌ Error starting server', error);
});
