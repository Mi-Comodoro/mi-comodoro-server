import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from '../accounts/account.module';
import { BudgetModule } from '../budgets/budget.module';
import { CategoryModule } from '../categories/category.module';
import { TransactionModule } from '../transactions/transaction.module';
import { SavingAllocationService } from './application/services/allocations.service';
import { GoalsService } from './application/services/goals.service';
import { PlannedSavingService } from './application/services/planned-saving.service';
import { SavingAllocationController } from './infrastructure/controllers/allocation.controller';
import { GoalsController } from './infrastructure/controllers/goals.controller';
import { PlannedSavingController } from './infrastructure/controllers/planned-saving.controller';
import { GoalHistoryEntity } from './infrastructure/database/entities/goal-history.entity';
import { SavingAllocationEntity } from './infrastructure/database/entities/saving-allocations.entity';
import { SavingGoalEntity } from './infrastructure/database/entities/saving-goals.entity';
import { PlannedSavingEntity } from './infrastructure/database/entities/saving-planned.entity';
import { SavingAllocationRepositoryImpl } from './infrastructure/repositories/allocations.repository.impl';
import { GoalHistoryRepositoryImpl } from './infrastructure/repositories/goal-history.repository.impl';
import { GoalsRepositoryImpl } from './infrastructure/repositories/goals.repository.impl';
import { PlannedSavingRepositoryImpl } from './infrastructure/repositories/planned.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SavingGoalEntity,
      SavingAllocationEntity,
      PlannedSavingEntity,
      GoalHistoryEntity,
    ]),
    AccountModule,
    forwardRef(() => BudgetModule),
    CategoryModule,
    TransactionModule,
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
      provide: 'GoalHistoryRepository',
      useClass: GoalHistoryRepositoryImpl,
    },
    {
      provide: 'SavingAllocationRepository',
      useClass: SavingAllocationRepositoryImpl,
    },
    {
      provide: 'PlannedSavingRepository',
      useClass: PlannedSavingRepositoryImpl,
    },
  ],
  controllers: [GoalsController, SavingAllocationController, PlannedSavingController],
  exports: ['SavingAllocationRepository', 'PlannedSavingRepository', 'GoalsRepository'],
})
export class SavingsModule {}
