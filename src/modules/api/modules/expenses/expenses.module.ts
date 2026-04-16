import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from '../accounts/account.module';
import { BudgetModule } from '../budgets/budget.module';
import { CategoryModule } from '../categories/category.module';
import { TransactionModule } from '../transactions/transaction.module';
import { ExpenseService } from './application/services/expense.service';
import { ExpenseController } from './infrastructure/controller/expense.controller';
import { PlannedExpenseEntity } from './infrastructure/database/expenses-planned.entity';
import { PlannedExpenseRepositoryImpl } from './infrastructure/repositories/expense-planned.repository.Impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlannedExpenseEntity]),
    forwardRef(() => BudgetModule),
    CategoryModule,
    TransactionModule,
    AccountModule,
  ],
  providers: [
    ExpenseService,
    { provide: 'PlannedExpenseRepository', useClass: PlannedExpenseRepositoryImpl },
  ],
  controllers: [ExpenseController],
  exports: ['PlannedExpenseRepository'],
})
export class ExpensesModule {}
