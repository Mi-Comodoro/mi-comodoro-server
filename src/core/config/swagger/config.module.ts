import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { getEnvironmentPath } from '@/common/helpers/environment.helpers';

import { SwaggerConfigService } from './config.service';
import swaggerRegister from './register';
const envFilePath: string = getEnvironmentPath();
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      load: [swaggerRegister],
      validationSchema: Joi.object({
        SWAGGER_URL: Joi.string().required(),
      }),
    }),
  ],
  providers: [SwaggerConfigService],
  exports: [SwaggerConfigService],
})
export class SwaggerConfigModule {}
