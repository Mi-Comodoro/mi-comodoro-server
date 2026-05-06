import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { BudgetModule } from '../budgets/budget.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FinancesModule } from '../finances/finances.module';
import { IncomesModule } from '../incomes/incomes.module';
import { SavingsModule } from '../savings/savings.module';
import { FinancialHealthService } from './application/financial-health.service';
import { FinancialHealthController } from './infrastructure/controller/financial-health.controller';
import { FinancialHealthScoreEntity } from './infrastructure/database/entities/financial-health-score.entity';
import { FinancialHealthScoreRepositoryImpl } from './infrastructure/repositories/financial-health-score.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialHealthScoreEntity]),
    FinancesModule,
    BudgetModule,
    IncomesModule,
    ExpensesModule,
    SavingsModule,
  ],
  providers: [
    LoggerProviderService,
    FinancialHealthService,
    {
      provide: 'FinancialHealthScoreRepository',
      useClass: FinancialHealthScoreRepositoryImpl,
    },
  ],
  controllers: [FinancialHealthController],
})
export class AnalyticsModule {}
