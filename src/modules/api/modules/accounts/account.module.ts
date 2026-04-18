import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OnboardingAccountListener } from './application/listeners/onboarding-account.listener';
import { AccountService } from './application/services/account.service';
import { AccountController } from './infrastructure/controller/account.controller';
import { AccountEntity } from './infrastructure/database/account.entity';
import { AccountRateHistoryEntity } from './infrastructure/database/account-rate-history.entity';
import { AccountRepositoryImpl } from './infrastructure/repositories/account.repository.impl';
import { AccountRateHistoryRepositoryImpl } from './infrastructure/repositories/account-rate-history.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity, AccountRateHistoryEntity])],
  providers: [
    AccountService,
    OnboardingAccountListener,
    {
      provide: 'AccountRepository',
      useClass: AccountRepositoryImpl,
    },
    {
      provide: 'AccountRateHistoryRepository',
      useClass: AccountRateHistoryRepositoryImpl,
    },
  ],
  controllers: [AccountController],
  exports: [AccountService, 'AccountRepository'],
})
export class AccountModule {}
