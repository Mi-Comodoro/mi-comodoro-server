import { NestFactory } from '@nestjs/core';

import { CategorySeederService } from '../modules/api/modules/categories/application/seed/categories.seed';
import { AppModule } from '../modules/app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seeder = app.get(CategorySeederService);

  await seeder.seed();

  await app.close();
}

bootstrap();
