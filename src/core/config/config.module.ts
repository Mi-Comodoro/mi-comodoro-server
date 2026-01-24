import { Module } from '@nestjs/common';

import { AppConfigModule } from './app/config.module';
import { SwaggerConfigModule } from './swagger/config.module';

@Module({
  imports: [AppConfigModule, SwaggerConfigModule],
})
export class InitialConfigModule {}
