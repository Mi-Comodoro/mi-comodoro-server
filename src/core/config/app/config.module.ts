import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

import { DEFAULT_PORT } from '../../../common/constants';
import { getEnvironmentPath } from '../../../common/helpers/environment.helpers';
import { AppConfigService } from './config.service';
import appRegister from './register';

const envFilePath: string = getEnvironmentPath();
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      load: [appRegister],
      validationSchema: Joi.object({
        APP_NAME: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('local', 'development', 'production')
          .default('development')
          .required(),
        APP_URL: Joi.string().required(),
        APP_PORT: Joi.number().default(DEFAULT_PORT).required(),
        // Obligatoria solo en producción (lista blanca CORS); en local/development se permite cualquier origen
        FRONTEND_URL: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional().allow(''),
        }),
      }),
    }),
  ],
  providers: [ConfigService, AppConfigService],
  exports: [ConfigService, AppConfigService],
})
export class AppConfigModule {}
