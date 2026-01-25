import { Module } from '@nestjs/common';

import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [HealthModule, AuthModule, AccountModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ApiModule {}
