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

  @Column({ name: 'cash_flow_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  cashFlowRate: number;

  @Column({ name: 'savings_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  savingsRate: number;

  @Column({
    name: 'expenses_excess_pct',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  expensesExcessPct: number;

  @Column({ name: 'dti', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dti: number;

  @Column({
    name: 'avg_monthly_income',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  avgMonthlyIncome: number;

  @Column({ name: 'total_income', type: 'bigint', nullable: true, default: 0 })
  totalIncome: number;

  @Column({ name: 'total_expenses', type: 'bigint', nullable: true, default: 0 })
  totalExpenses: number;

  @Column({ name: 'total_savings', type: 'bigint', nullable: true, default: 0 })
  totalSavings: number;

  @CreateDateColumn({ name: 'calculated_at' })
  calculatedAt: Date;
}
