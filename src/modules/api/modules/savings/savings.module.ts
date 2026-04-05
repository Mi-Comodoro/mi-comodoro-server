import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BudgetEntity } from '../budgets/infrastructure/database/entities/budget.entity';
import { BudgetRepositoryImpl } from '../budgets/infrastructure/repositories/budget.repository.impl';
import { CategoryEntity } from '../categories/infrastructure/database/category.entity';
import { CategoryRepositoryImpl } from '../categories/infrastructure/repositories/category.repository.impl';
import { TransactionEntity } from '../transactions/infrastructure/database/entities/transaction.entity';
import { TransactionRepositoryImpl } from '../transactions/infrastructure/repositories/transaction.repository.impl';
import { SavingAllocationService } from './application/services/allocations.service';
import { GoalsService } from './application/services/goals.service';
import { PlannedSavingService } from './application/services/planned-saving.service';
import { SavingAllocationController } from './infrastructure/controllers/allocation.controller';
import { GoalsController } from './infrastructure/controllers/goals.controller';
import { PlannedSavingController } from './infrastructure/controllers/planned-saving.controller';
import { SavingAllocationEntity } from './infrastructure/database/entities/saving-allocations.entity';
import { SavingGoalEntity } from './infrastructure/database/entities/saving-goals.entity';
import { PlannedSavingEntity } from './infrastructure/database/entities/saving-planned.entity';
import { SavingAllocationRepositoryImpl } from './infrastructure/repositories/allocations.repository.impl';
import { GoalsRepositoryImpl } from './infrastructure/repositories/goals.repository.impl';
import { PlannedSavingRepositoryImpl } from './infrastructure/repositories/planned.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SavingGoalEntity,
      SavingAllocationEntity,
      PlannedSavingEntity,
      TransactionEntity,
      BudgetEntity,
      CategoryEntity,
    ]),
  ],
  providers: [
    GoalsService,
    SavingAllocationService,
    PlannedSavingService,
    {
      provide: 'GoalsRepository',
      useClass: GoalsRepositoryImpl,
    },
    {
      provide: 'SavingAllocationRepository',
      useClass: SavingAllocationRepositoryImpl,
    },

    {
      provide: 'PlannedSavingRepository',
      useClass: PlannedSavingRepositoryImpl,
    },

    {
      provide: 'TransactionRepository',
      useClass: TransactionRepositoryImpl,
    },

    {
      provide: 'BudgetRepository',
      useClass: BudgetRepositoryImpl,
    },
    {
      provide: 'CategoryRepository',
      useClass: CategoryRepositoryImpl,
    },
  ],
  controllers: [GoalsController, SavingAllocationController, PlannedSavingController],
  exports: ['SavingAllocationRepository', 'PlannedSavingRepository', 'GoalsRepository'],
})
export class SavingsModule {}
