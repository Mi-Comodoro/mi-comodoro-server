import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { GoalHistory } from '../../../domain/goal-history';

@Entity('goal_history')
export class GoalHistoryEntity implements GoalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'goal_id' })
  goalId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  field: string;

  @Column({ name: 'old_value', type: 'varchar', nullable: true })
  oldValue: string | null;

  @Column({ name: 'new_value' })
  newValue: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
