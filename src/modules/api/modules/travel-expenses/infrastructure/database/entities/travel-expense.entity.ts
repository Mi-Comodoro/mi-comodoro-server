import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { SplitType, TravelExpense } from '../../../domain/travel-expense';

@Entity('travel_expenses')
export class TravelExpenseEntity implements TravelExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ name: 'paid_by', type: 'uuid' })
  paidBy: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: Date;

  @Column({
    type: 'enum',
    enum: ['EQUAL', 'CUSTOM', 'PERCENTAGE'],
    default: 'EQUAL',
  })
  splitType: SplitType;

  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
