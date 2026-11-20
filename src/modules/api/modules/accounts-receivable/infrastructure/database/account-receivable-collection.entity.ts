import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AccountReceivableCollection } from '../../domain/account-receivable-collection';
import { AccountReceivableEntity } from './account-receivable.entity';

@Entity('account_receivable_collections')
export class AccountReceivableCollectionEntity implements AccountReceivableCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_receivable_id', type: 'uuid' })
  accountReceivableId: string;

  @ManyToOne(() => AccountReceivableEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_receivable_id' })
  accountReceivable: AccountReceivableEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date', name: 'collection_date' })
  collectionDate: Date;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
