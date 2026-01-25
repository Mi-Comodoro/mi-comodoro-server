import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { AccountService } from './application/account.service';
import { AccountController } from './infrastructure/controller/account.controller';
import { AccountEntity } from './infrastructure/database/account.entity';
import { AccountRepositoryImpl } from './infrastructure/repository/account.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity])],
  providers: [
    AccountService,
    LoggerProviderService,
    {
      provide: 'AccountRepository',
      useClass: AccountRepositoryImpl,
    },
  ],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
