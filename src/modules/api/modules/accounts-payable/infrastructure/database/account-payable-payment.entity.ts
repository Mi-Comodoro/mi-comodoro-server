import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AccountPayablePayment } from '../../domain/account-payable-payment';
import { AccountPayableEntity } from './account-payable.entity';

@Entity('account_payable_payments')
export class AccountPayablePaymentEntity implements AccountPayablePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_payable_id', type: 'uuid' })
  accountPayableId: string;

  @ManyToOne(() => AccountPayableEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_payable_id' })
  accountPayable: AccountPayableEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date', name: 'payment_date' })
  paymentDate: Date;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
