import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountsReceivableModule } from '../accounts-receivable/accounts-receivable.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountsPayableService } from './application/accounts-payable.service';
import { AccountsPayableController } from './infrastructure/controller/accounts-payable.controller';
import { AccountPayableEntity } from './infrastructure/database/account-payable.entity';
import { AccountPayablePaymentEntity } from './infrastructure/database/account-payable-payment.entity';
import { AccountPayableRepositoryImpl } from './infrastructure/repositories/account-payable.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountPayableEntity, AccountPayablePaymentEntity]),
    forwardRef(() => AccountsReceivableModule),
    NotificationsModule,
  ],
  controllers: [AccountsPayableController],
  providers: [
    AccountsPayableService,
    { provide: 'AccountPayableRepository', useClass: AccountPayableRepositoryImpl },
  ],
  exports: [AccountsPayableService],
})
export class AccountsPayableModule {}
