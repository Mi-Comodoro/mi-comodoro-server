import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PlannedExpenseEntity } from '@/modules/api/modules/expenses/infrastructure/database/expenses-planned.entity';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { Budget, BudgetStatus } from '../../../domain/budget';

@Entity('budgets')
export class BudgetEntity implements Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ name: 'name', nullable: false })
  name: string;
  @Column({ name: 'month', nullable: false })
  month: string;
  @Column({ name: 'year', nullable: false, default: new Date().getFullYear() })
  year: number;
  @Column({ name: 'strategy', nullable: false })
  strategy: 'BALANCED' | 'CUSTOM';
  @Column({ name: 'frequency', nullable: false, default: 'monthly' })
  frequency: string;
  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'CLOSED', 'PLANNED'],
    name: 'status',
    nullable: false,
    default: 'PLANNED',
  })
  status: BudgetStatus;

  @Column({ name: 'is_shared', nullable: false })
  isShared: boolean;

  @Column({ name: 'needs', nullable: false })
  needsLimit: number;
  @Column({ name: 'wants', nullable: false })
  wantsLimit: number;
  @Column({ name: 'savings', nullable: false })
  savingsLimit: number;
  @Column({ name: 'finances_id', nullable: false })
  financesId: string;
  @Column({ name: 'ownerId', nullable: false })
  ownerId: string;
  @Column({ name: 'partnerId', nullable: true })
  partnerId?: string;
  @Column({ name: 'updatedBy', nullable: true })
  updatedBy?: string;
  @Column({
    name: 'carry_forward_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    default: 0,
  })
  carryForwardAmount?: number;
  @ManyToOne(() => UserEntity, (user) => user.budgets, { onDelete: 'CASCADE' })
  owner: UserEntity;
  @OneToMany(() => PlannedExpenseEntity, (expense) => expense.budget)
  plannedExpenses: PlannedExpenseEntity[];
  @ManyToOne(() => UserEntity, { nullable: true })
  partner?: UserEntity;
  @OneToMany(() => TransactionEntity, (transaction) => transaction.budget)
  transactions: TransactionEntity[];

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true, default: null })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
