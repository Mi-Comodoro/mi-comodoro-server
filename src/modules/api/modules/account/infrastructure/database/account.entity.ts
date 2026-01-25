import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from '../../../users/infrastructure/database/user.entity';

@Entity('accounts')
export class AccountEntity {
  @PrimaryColumn('uuid')
  id: string;
  @Column({ name: 'user_id', unique: true })
  userId: string;
  @Column({ name: 'name', nullable: false })
  name: string;
  @Column({ name: 'display_name', nullable: true })
  displayName?: string;
  @Column({ nullable: true })
  gender?: string;
  @Column({ type: 'char', length: 2, nullable: true })
  country?: string;
  @Column({ name: 'usage_type', nullable: true })
  usageType?: string;
  @Column({ name: 'financial_profile', nullable: true })
  financialProfile?: string;
  @Column()
  type: string;
  @Column({ name: 'trial_ends_at', nullable: true })
  trialEndsAt?: Date;
  @Column({ name: 'is_active', default: true })
  isActive: boolean;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (user) => user.account)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
