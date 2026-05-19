import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_settings')
export class SettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ default: 'COP' })
  currency: string;

  @Column({ default: 'es' })
  language: string;

  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled: boolean;

  @Column({ name: 'budget_alert_threshold', default: 80 })
  budgetAlertThreshold: number;

  @Column({
    name: 'savings_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 20,
  })
  savingsPercentage: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
