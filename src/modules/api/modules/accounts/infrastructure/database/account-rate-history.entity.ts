import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AccountEntity } from './account.entity';

@Entity('account_rate_history')
export class AccountRateHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ type: 'decimal', precision: 6, scale: 4, name: 'previous_rate' })
  previousRate: number;

  @Column({ type: 'decimal', precision: 6, scale: 4, name: 'new_rate' })
  newRate: number;

  @Column({ type: 'timestamp', name: 'changed_at' })
  changedAt: Date;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
