import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { AccountsPayableModule } from '../accounts-payable/accounts-payable.module';
import { AccountsReceivableModule } from '../accounts-receivable/accounts-receivable.module';
import { BudgetModule } from '../budgets/budget.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FinancesModule } from '../finances/finances.module';
import { IncomesModule } from '../incomes/incomes.module';
import { SavingsModule } from '../savings/savings.module';
import { TransactionModule } from '../transactions/transaction.module';
import { AnalyticsCombinedService } from './application/analytics-combined.service';
import { FinancialHealthService } from './application/financial-health.service';
import { AnalyticsCombinedController } from './infrastructure/controller/analytics-combined.controller';
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
    AccountsPayableModule,
    AccountsReceivableModule,
    TransactionModule,
  ],
  providers: [
    LoggerProviderService,
    FinancialHealthService,
    AnalyticsCombinedService,
    {
      provide: 'FinancialHealthScoreRepository',
      useClass: FinancialHealthScoreRepositoryImpl,
    },
  ],
  controllers: [FinancialHealthController, AnalyticsCombinedController],
})
export class AnalyticsModule {}
