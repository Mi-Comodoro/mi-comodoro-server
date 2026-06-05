import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { ExpensesModule } from '../expenses/expenses.module';
import { FinancesModule } from '../finances/finances.module';
import { IncomesModule } from '../incomes/incomes.module';
import { SavingsModule } from '../savings/savings.module';
import { UsersModule } from '../users/users.module';
import { BudgetService } from './application/budget.service';
import { OnboardingBudgetListener } from './application/onboarding-budget.listener';
import { BudgetController } from './infrastructure/controller/budget.controller';
import { BudgetEntity } from './infrastructure/database/entities/budget.entity';
import { BudgetRepositoryImpl } from './infrastructure/repositories/budget.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([BudgetEntity]),
    FinancesModule,
    SavingsModule,
    ExpensesModule,
    forwardRef(() => IncomesModule),
    forwardRef(() => UsersModule),
  ],
  providers: [
    LoggerProviderService,
    BudgetService,
    OnboardingBudgetListener,
    {
      provide: 'BudgetRepository',
      useClass: BudgetRepositoryImpl,
    },
  ],
  controllers: [BudgetController],
  exports: [BudgetService, 'BudgetRepository'],
})
export class BudgetModule {}
