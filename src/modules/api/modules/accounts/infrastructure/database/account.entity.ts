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
import { Account, CompoundingFrequency } from '../../domain/account';

@Entity('accounts')
export class AccountEntity implements Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;
  @Column({ nullable: true })
  description: string;
  @Column({ nullable: true })
  type: string;
  @Column({
    name: 'interest_rate',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  interestRate: number;
  @Column({
    name: 'compounding_frequency',
    type: 'enum',
    enum: ['daily', 'monthly', 'annually'],
    default: 'monthly',
  })
  compoundingFrequency: CompoundingFrequency;
  @Column({ name: 'is_active', default: true })
  isActive: boolean;
  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
