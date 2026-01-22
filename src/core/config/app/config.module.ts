import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getEnvironmentPath } from '../../../common/helpers/environment.helpers';
import { DEFAULT_PORT, ENVIRONMENT_PATH } from '../../../common/constants';
import appRegister from './register';
import * as Joi from 'joi';
import { AppConfigService } from './config.service';

const envFilePath: string = getEnvironmentPath(ENVIRONMENT_PATH);
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      load: [appRegister],
      validationSchema: Joi.object({
        APP_NAME: Joi.string().required(),
        APP_ENV: Joi.string()
          .valid('local', 'development', 'production')
          .default('development')
          .required(),
        APP_URL: Joi.string().required(),
        APP_PORT: Joi.number().default(DEFAULT_PORT).required(),
      }),
    }),
  ],
  providers: [ConfigService, AppConfigService],
  exports: [ConfigService, AppConfigService],
})
export class AppConfigModule {}
