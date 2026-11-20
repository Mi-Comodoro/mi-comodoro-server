import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { BudgetModule } from '../budgets/budget.module';
import { PlannedExpenseEntity } from '../expenses/infrastructure/database/expenses-planned.entity';
import { UsersModule } from '../users/users.module';
import { BillsService } from './application/services/bills.service';
import { BillsController } from './infrastructure/controller/bills.controller';
import { BillsEntity } from './infrastructure/database/bills.entity';
import { BillsRepositoryImpl } from './infrastructure/repositories/bills.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillsEntity, PlannedExpenseEntity]),
    BudgetModule,
    UsersModule,
  ],
  providers: [
    LoggerProviderService,
    BillsService,
    { provide: 'BillsRepository', useClass: BillsRepositoryImpl },
  ],
  controllers: [BillsController],
  exports: [BillsService],
})
export class BillsModule {}
