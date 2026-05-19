import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupMemberEntity } from '../groups/infrastructure/database/entities/group-member.entity';
import { TravelExpenseService } from './application/services/travel-expense.service';
import { TravelExpenseController } from './infrastructure/controller/travel-expense.controller';
import { TravelExpenseEntity } from './infrastructure/database/entities/travel-expense.entity';
import { TravelExpenseAssignmentEntity } from './infrastructure/database/entities/travel-expense-assignment.entity';
import { TravelExpenseRepositoryImpl } from './infrastructure/repositories/travel-expense.repository.impl';
import { TravelExpenseAssignmentRepositoryImpl } from './infrastructure/repositories/travel-expense-assignment.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TravelExpenseEntity,
      TravelExpenseAssignmentEntity,
      GroupMemberEntity,
    ]),
  ],
  providers: [
    TravelExpenseService,
    {
      provide: 'TravelExpenseRepository',
      useClass: TravelExpenseRepositoryImpl,
    },
    {
      provide: 'TravelExpenseAssignmentRepository',
      useClass: TravelExpenseAssignmentRepositoryImpl,
    },
  ],
  controllers: [TravelExpenseController],
})
export class TravelExpenseModule {}
