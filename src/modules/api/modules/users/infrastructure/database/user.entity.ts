import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BudgetEntity } from '../../../budgets/infrastructure/database/entities/budget.entity';
import { FinancesEntity } from '../../../finances/infrastructure/database/entities/finances.entity';
import { SavingGoalEntity } from '../../../savings/infrastructure/database/entities/saving-goals.entity';
import { TransactionEntity } from '../../../transactions/infrastructure/database/entities/transaction.entity';
import { UserProfileEntity } from '../../../user-profile/infrastructure/database/entities/user-profile.entity';
import { UserRole } from '../../domain/user-role.enum';

enum PROVIDERS {
  'LOCAL' = 'LOCAL',
  'GOOGLE' = 'GOOGLE',
}

enum ON_BOARDING {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
}
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ unique: true, name: 'email', nullable: false })
  email: string;
  @Column({ name: 'password', nullable: true })
  password: string;
  @Column({ name: 'provider', nullable: false, default: PROVIDERS.LOCAL, enum: PROVIDERS })
  provider: string;
  @Column({ name: 'onboarding', nullable: false, default: ON_BOARDING.PENDING, enum: ON_BOARDING })
  onboarding: string;
  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;
  @Column({ type: 'varchar', unique: true, nullable: true, length: 20 })
  handle?: string | null;
  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;
  @Column({ default: 'America/Bogota' })
  timezone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  @OneToOne(() => UserProfileEntity, (userProfile) => userProfile.user)
  userProfile: UserProfileEntity;
  @OneToMany(() => BudgetEntity, (budget) => budget.owner)
  budgets: BudgetEntity[];
  @OneToOne(() => FinancesEntity, (finances) => finances.user)
  finances: FinancesEntity;
  @OneToMany(() => TransactionEntity, (transaction) => transaction.user)
  transactions: TransactionEntity[];
  @OneToMany(() => SavingGoalEntity, (savingGoal) => savingGoal.user, { onDelete: 'CASCADE' })
  savingGoals: SavingGoalEntity[];
}
