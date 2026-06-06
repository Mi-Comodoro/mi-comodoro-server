import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { Finances } from '../../../domain/finances';

@Entity('finances')
export class FinancesEntity implements Finances {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true, nullable: false })
  userId: string;

  @Column({ name: 'profile', nullable: false })
  profile: 'employee' | 'freelancer' | 'business_owner';

  @Column({ name: 'currency', nullable: false })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (user) => user.finances, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
