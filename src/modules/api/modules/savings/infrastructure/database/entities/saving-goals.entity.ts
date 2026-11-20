import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AccountEntity } from '@/modules/api/modules/accounts/infrastructure/database/account.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { GoalStatus, SavingGoal } from '../../../domain/savings-goals';

@Entity('saving_goals')
export class SavingGoalEntity implements SavingGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  reason: string;

  @Column({
    name: 'target_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  targetAmount: number;

  @Column({
    name: 'target_date',
    type: 'date',
    nullable: true,
  })
  targetDate: Date;
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => UserEntity, (user) => user.savingGoals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.SCHEDULED,
  })
  status: GoalStatus;

  @Column({ name: 'last_interest_date', nullable: true, type: 'date' })
  lastInterestDate?: Date | null;

  @Column({ name: 'nulled_at', nullable: true, type: 'timestamptz' })
  nulledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
