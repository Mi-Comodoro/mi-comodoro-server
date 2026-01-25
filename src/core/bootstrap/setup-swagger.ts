import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { SwaggerConfigService } from '../config/index';

export const setupSwagger = (app: INestApplication, configService: SwaggerConfigService) => {
  const url = configService.url.startsWith('http')
    ? configService.url
    : `http://${configService.url}`;

  const options = new DocumentBuilder()
    .setTitle(configService.title)
    .setDescription(configService.description)
    .setVersion(configService.version)
    .addServer(url, configService.title)
    .addTag(configService.tag)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'bearerAuth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(configService.path, app, document);
};
