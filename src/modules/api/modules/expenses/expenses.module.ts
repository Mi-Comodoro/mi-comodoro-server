import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExpenseService } from './application/services/expense.service';
import { ExpenseController } from './infrastructure/controller/expense.controller';
import { PlannedExpenseEntity } from './infrastructure/database/expenses-planned.entity';
import { PlannedExpenseRepositoryImpl } from './infrastructure/repositories/expense-planned.repository.Impl';

@Module({
  imports: [TypeOrmModule.forFeature([PlannedExpenseEntity])],
  providers: [
    ExpenseService,
    { provide: 'PlannedExpenseRepository', useClass: PlannedExpenseRepositoryImpl },
  ],
  controllers: [ExpenseController],
  exports: ['PlannedExpenseRepository'],
})
export class ExpensesModule {}
