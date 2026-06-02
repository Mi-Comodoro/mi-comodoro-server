import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from '../../../users/infrastructure/database/user.entity';
import { AccountPayable } from '../../domain/account-payable';

@Entity('accounts_payable')
export class AccountPayableEntity implements AccountPayable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['loan', 'credit_card', 'installment', 'other'],
    default: 'other',
  })
  type: 'loan' | 'credit_card' | 'installment' | 'other';

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'original_amount' })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'current_balance' })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'minimum_payment', nullable: true })
  minimumPayment: number;

  @Column({ type: 'decimal', precision: 6, scale: 4, name: 'interest_rate', nullable: true })
  interestRate: number;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({ type: 'date', name: 'next_payment_date', nullable: true })
  nextPaymentDate: Date;

  @Column({ type: 'enum', enum: ['active', 'paid', 'overdue'], default: 'active' })
  status: 'active' | 'paid' | 'overdue';

  @Column({ name: 'linked_cxc_id', nullable: true })
  linkedCxcId?: string;

  @Column({ name: 'nulled_at', nullable: true, type: 'timestamp' })
  nulledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
