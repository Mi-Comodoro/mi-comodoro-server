import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from '../accounts/account.module';
import { BudgetModule } from '../budgets/budget.module';
import { CategoryModule } from '../categories/category.module';
import { TransactionService } from './application/services/transaction.service';
import { TransactionController } from './infrastructure/controllers/transaction.controller';
import { TransactionEntity } from './infrastructure/database/entities/transaction.entity';
import { TransactionRepositoryImpl } from './infrastructure/repositories/transaction.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    forwardRef(() => BudgetModule),
    CategoryModule,
    AccountModule,
  ],
  providers: [
    TransactionService,
    {
      provide: 'TransactionRepository',
      useClass: TransactionRepositoryImpl,
    },
  ],
  controllers: [TransactionController],
  exports: ['TransactionRepository'],
})
export class TransactionModule {}
