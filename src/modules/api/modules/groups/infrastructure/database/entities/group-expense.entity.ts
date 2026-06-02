import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { ExpenseStatus, GroupExpense } from '../../../domain/group-expense';

@Entity('group_expenses')
export class GroupExpenseEntity implements GroupExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'responsible_user_id', type: 'uuid' })
  responsibleUserId: string;

  @Column({
    type: 'enum',
    enum: ['planned', 'paid', 'cxp'],
    default: 'planned',
  })
  status: ExpenseStatus;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId?: string | null;

  @Column({ name: 'cxp_id', type: 'uuid', nullable: true })
  cxpId?: string | null;

  @Column({ name: 'cxc_id', type: 'uuid', nullable: true })
  cxcId?: string | null;

  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
