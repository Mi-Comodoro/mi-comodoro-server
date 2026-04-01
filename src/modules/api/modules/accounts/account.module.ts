import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountService } from './application/services/account.service';
import { AccountController } from './infrastructure/controller/account.controller';
import { AccountEntity } from './infrastructure/database/account.entity';
import { AccountRepositoryImpl } from './infrastructure/repositories/account.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity])],
  providers: [
    AccountService,
    {
      provide: 'AccountRepository',
      useClass: AccountRepositoryImpl,
    },
  ],
  controllers: [AccountController],
  exports: [AccountService, 'AccountRepository'],
})
export class AccountModule {}
