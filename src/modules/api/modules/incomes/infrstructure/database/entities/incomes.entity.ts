import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { IncomeFrequency, IncomeSource } from '../../../domain/incomes';

@Entity('incomes')
export class IncomesEntity implements IncomeSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source', nullable: false })
  source: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount: number;

  @Column({ name: 'payment_days', type: 'simple-array', nullable: false })
  paymentDays: number[];

  @Column({
    type: 'enum',
    enum: ['monthly', 'biweekly'],
  })
  frequency: IncomeFrequency;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: UserEntity;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
