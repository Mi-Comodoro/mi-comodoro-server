import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CategoryEntity } from '../../../categories/infrastructure/database/category.entity';
import { PlannedExpenseEntity } from '../../../expenses/infrastructure/database/expenses-planned.entity';
import { UserEntity } from '../../../users/infrastructure/database/user.entity';
import { Bill, BillFrequency } from '../../domain/bills';

@Entity('bills')
export class BillsEntity implements Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column()
  name: string;

  @Column({ name: 'expected_amount', type: 'decimal', precision: 12, scale: 2 })
  expectedAmount: number;

  @Column({ name: 'billing_day' })
  billingDay: number;

  @Column({ type: 'enum', enum: ['monthly', 'yearly'] })
  frequency: BillFrequency;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_paid' })
  isPaid: boolean;

  @OneToMany(() => PlannedExpenseEntity, (expense) => expense.bill)
  plannedExpenses: PlannedExpenseEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
