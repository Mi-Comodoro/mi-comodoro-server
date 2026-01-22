import * as Joi from 'joi';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import swaggerRegister from './register';
import { SwaggerConfigService } from './config.service';
import { getEnvironmentPath } from '@/common/helpers/environment.helpers';
import { ENVIRONMENT_PATH } from '@/common/constants';
const envFilePath: string = getEnvironmentPath(ENVIRONMENT_PATH);
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
