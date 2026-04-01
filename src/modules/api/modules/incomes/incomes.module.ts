import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BudgetModule } from '../budgets/budget.module';
import { CategoryModule } from '../categories/category.module';
import { SavingsModule } from '../savings/savings.module';
import { TransactionModule } from '../transactions/transaction.module';
import { OnboardingIncomesListener } from './application/listeners/onboarding-incomes.listener';
import { IncomesService } from './application/services/incomes.service';
import { PlannedIncomeService } from './application/services/planned-income.service';
import { IncomesController } from './infrstructure/controller/incomes.controller';
import { PlannedIncomeController } from './infrstructure/controller/planned-incomes.controller';
import { IncomesEntity } from './infrstructure/database/entities/incomes.entity';
import { PlannedIncomeEntity } from './infrstructure/database/entities/incomes-planned.entity';
import { IncomesRepositoryImpl } from './infrstructure/repositories/incomes.repository.impl';
import { PlannedIncomeRepositoryImpl } from './infrstructure/repositories/incomes-planned.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([IncomesEntity, PlannedIncomeEntity]),
    SavingsModule, // ← provee PlannedSavingRepository, SavingAllocationRepository
    TransactionModule, // ← provee TransactionRepository
    CategoryModule, // ← provee CategoryRepository
    forwardRef(() => BudgetModule),
  ],
  providers: [
    IncomesService,
    PlannedIncomeService,
    OnboardingIncomesListener,
    {
      provide: 'IncomesRepository',
      useClass: IncomesRepositoryImpl,
    },
    {
      provide: 'PlannedIncomeRepository',
      useClass: PlannedIncomeRepositoryImpl,
    },
  ],
  controllers: [IncomesController, PlannedIncomeController],
  exports: ['PlannedIncomeRepository'],
})
export class IncomesModule {}
