import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AccountType } from '@/common/enums/account-type.enum';
import { GenderEnum } from '@/modules/api/modules/shared/enum/enum';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { UserProfile } from '../../../domain/user-profile.entity';
import { GenderType } from '../../../domain/user-profile.types';

@Entity('user_profile')
export class UserProfileEntity implements UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ name: 'user_id', unique: true })
  userId: string;
  @Column({ name: 'name', nullable: false })
  name: string;
  @Column({ name: 'display_name', nullable: true })
  displayName?: string;
  @Column({ name: 'phone', nullable: true })
  phone?: string;
  @Column({ name: 'photo', nullable: true })
  photo?: string;
  @Column({ nullable: true, default: GenderEnum.PREFER_NOT_TO_SAY })
  gender?: GenderType;
  @Column({ type: 'char', length: 2, nullable: true })
  country?: string;
  @Column({
    name: 'type',
    type: 'enum',
    enum: AccountType,
    default: AccountType.TRIAL,
  })
  accountType: AccountType;
  @Column({ name: 'trial_ends_at', type: 'timestamp', nullable: true })
  trialEndsAt: Date | null;
  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'phone_verified_at', type: 'timestamptz', nullable: true })
  phoneVerifiedAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (user) => user.userProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: UserEntity;
}
