import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { FinancialHealthScore, HealthLevel } from '../../../domain/financial-health-score';

@Entity('financial_health_scores')
export class FinancialHealthScoreEntity implements FinancialHealthScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: false })
  userId: string;

  @Column({ name: 'total_score', type: 'int', nullable: false })
  totalScore: number;

  @Column({ name: 'cash_flow_score', type: 'int', nullable: false })
  cashFlowScore: number;

  @Column({ name: 'savings_score', type: 'int', nullable: false })
  savingsScore: number;

  @Column({ name: 'expense_score', type: 'int', nullable: false })
  expenseScore: number;

  @Column({ name: 'debt_score', type: 'int', nullable: false })
  debtScore: number;

  @Column({ name: 'level', type: 'varchar', nullable: false })
  level: HealthLevel;

  @CreateDateColumn({ name: 'calculated_at' })
  calculatedAt: Date;
}
