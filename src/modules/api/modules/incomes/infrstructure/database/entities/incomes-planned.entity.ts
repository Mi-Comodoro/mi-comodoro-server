import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';

import { type INCOME_STATUS, PlannedIncome } from '../../../domain/income-planned';
import { IncomesEntity } from './incomes.entity';

@Entity('incomes_planned')
export class PlannedIncomeEntity implements PlannedIncome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'income_source_id', nullable: true })
  incomeSourceId?: string;
  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId: string;

  @Column({ name: 'source_label', nullable: true })
  source: string;

  @Column('decimal')
  amount: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'RECEIVED', 'SKIPPED'],
    default: 'PENDING',
  })
  status: INCOME_STATUS;

  @ManyToOne(() => BudgetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: BudgetEntity;

  @ManyToOne(() => IncomesEntity, { nullable: true })
  @JoinColumn({ name: 'income_source_id' })
  incomeSource?: IncomesEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
