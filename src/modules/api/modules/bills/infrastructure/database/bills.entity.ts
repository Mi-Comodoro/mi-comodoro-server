import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CategoryEntity } from '../../../categories/infrastructure/database/category.entity';
import { PlannedExpenseEntity } from '../../../expenses/infrastructure/database/expenses-planned.entity';
import { UserEntity } from '../../../users/infrastructure/database/user.entity';
import { Bills } from '../../domain/bills';

export type FrequencyType = 'weekly' | 'biweekly' | 'monthly' | 'yearly';
@Entity('bills')
export class BillsEntity implements Bills {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { eager: true })
  user: UserEntity;

  @ManyToOne(() => CategoryEntity, { eager: true })
  category: CategoryEntity;

  @Column()
  name: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  expectedAmount: number;

  @Column()
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ['monthly', 'weekly', 'yearly', 'biweekly'],
  })
  frequency: FrequencyType;
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: true, name: 'is_paid' })
  isPaid: boolean;

  @OneToMany(() => PlannedExpenseEntity, (expense) => expense.bill)
  plannedExpenses: PlannedExpenseEntity[];
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
