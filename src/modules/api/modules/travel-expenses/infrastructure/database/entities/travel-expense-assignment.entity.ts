import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import type { TravelExpenseAssignment } from '../../../domain/travel-expense-assignment';

@Entity('travel_expense_assignments')
export class TravelExpenseAssignmentEntity implements TravelExpenseAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'expense_id', type: 'uuid' })
  expenseId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'assigned_amount', type: 'decimal', precision: 15, scale: 2 })
  assignedAmount: number;

  @Column({ default: false })
  settled: boolean;

  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;
}
