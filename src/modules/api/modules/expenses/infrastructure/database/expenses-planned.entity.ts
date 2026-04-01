import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BillsEntity } from '../../../bills/infrastructure/database/bills.entity';
import { BudgetEntity } from '../../../budgets/infrastructure/database/entities/budget.entity';
import { CategoryEntity } from '../../../categories/infrastructure/database/category.entity';
import { PlannedExpense } from '../../domain/expenses';

@Entity('expenses_planned')
export class PlannedExpenseEntity implements PlannedExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /*
   * Budget al que pertenece este gasto
   */
  @ManyToOne(() => BudgetEntity, (budget) => budget.plannedExpenses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'budget_id' })
  budget: BudgetEntity;

  @Column({ name: 'budget_id' })
  budgetId: string;

  /*
   * Bill asociado (si proviene de una factura recurrente)
   */
  @ManyToOne(() => BillsEntity, (bill) => bill.plannedExpenses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'bill_id' })
  bill?: BillsEntity;

  @Column({ nullable: true, name: 'bill_id' })
  billsId?: string;

  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;
  @Column({ name: 'category_id' })
  categoryId: string;
  @Column()
  name: string;
  @Column({ name: 'expected_amount', type: 'decimal', precision: 12, scale: 2 })
  expectedAmount: number;
  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;
  @Column()
  status: 'PLANNED' | 'PAID' | 'CANCELED' | 'SKIPPED';
  @Column({ default: true, name: 'is_essential' })
  isEssential: boolean;
  @Column({ type: 'text', nullable: true })
  notes?: string;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
