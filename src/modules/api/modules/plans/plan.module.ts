import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlansService } from './application/services/plans.service';
import { AdminPlansController } from './infrastructure/controller/admin-plans.controller';
import { PlansController } from './infrastructure/controller/plans.controller';
import { PlanEntity } from './infrastructure/database/plan.entity';
import { PlanRepositoryImpl } from './infrastructure/repositories/plan.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([PlanEntity])],
  controllers: [PlansController, AdminPlansController],
  providers: [
    PlansService,
    LoggerProviderService,
    { provide: 'PlanRepository', useClass: PlanRepositoryImpl },
  ],
})
export class PlansModule {}
