import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';

import { SavingAllocation } from '../../../domain/savings-allocations';
import { SavingGoalEntity } from './saving-goals.entity';

@Entity('saving_allocations')
export class SavingAllocationEntity implements SavingAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  percentage: number;

  @Column({ name: 'goal_id', type: 'uuid' })
  goalId: string;

  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId: string;
  @ManyToOne(() => BudgetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: BudgetEntity;

  @ManyToOne(() => SavingGoalEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: SavingGoalEntity;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @CreateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
