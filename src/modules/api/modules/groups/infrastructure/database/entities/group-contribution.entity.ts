import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import type { GroupContribution } from '../../../domain/group-contribution';

@Entity('group_contributions')
export class GroupContributionEntity implements GroupContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'budget_id', type: 'uuid', nullable: true })
  budgetId?: string | null;

  @Column({ name: 'budget_label', type: 'varchar', nullable: true })
  budgetLabel?: string | null;

  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
