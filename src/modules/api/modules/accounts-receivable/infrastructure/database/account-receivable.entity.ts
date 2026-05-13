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
import { AccountReceivable } from '../../domain/account-receivable';

@Entity('accounts_receivable')
export class AccountReceivableEntity implements AccountReceivable {
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

  @Column({ nullable: true })
  debtor: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'original_amount' })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'current_balance' })
  currentBalance: number;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'partial', 'collected', 'overdue'],
    default: 'pending',
  })
  status: 'pending' | 'partial' | 'collected' | 'overdue';

  @Column({ name: 'nulled_at', nullable: true, type: 'timestamp' })
  nulledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
