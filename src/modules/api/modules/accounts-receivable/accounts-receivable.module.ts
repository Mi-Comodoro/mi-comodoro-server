import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountsReceivableService } from './application/accounts-receivable.service';
import { AccountsReceivableController } from './infrastructure/controller/accounts-receivable.controller';
import { AccountReceivableEntity } from './infrastructure/database/account-receivable.entity';
import { AccountReceivableCollectionEntity } from './infrastructure/database/account-receivable-collection.entity';
import { AccountReceivableRepositoryImpl } from './infrastructure/repositories/account-receivable.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([AccountReceivableEntity, AccountReceivableCollectionEntity])],
  controllers: [AccountsReceivableController],
  providers: [
    AccountsReceivableService,
    { provide: 'AccountReceivableRepository', useClass: AccountReceivableRepositoryImpl },
  ],
  exports: [AccountsReceivableService],
})
export class AccountsReceivableModule {}
