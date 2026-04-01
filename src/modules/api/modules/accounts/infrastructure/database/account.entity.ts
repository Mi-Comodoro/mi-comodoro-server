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
  @Column({
    type: 'decimal',
    precision: 10, // Un número total más grande es más seguro
    scale: 4, // Permite hasta 4 decimales (ej. 12.5525)
    nullable: true,
  })
  interestRate: number;
  @Column({ type: 'enum', enum: ['daily', 'monthly', 'annually'], default: 'monthly' })
  compoundingFrequency: CompoundingFrequency;
  @Column({ default: true })
  isActive: boolean;
  @Column({ name: 'user_id' })
  userId: string;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
