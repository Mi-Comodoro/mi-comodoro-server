import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { AccountEntity } from '@/modules/api/modules/accounts/infrastructure/database/account.entity';
import { BillsEntity } from '@/modules/api/modules/bills/infrastructure/database/bills.entity';
import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';
import { CategoryEntity } from '@/modules/api/modules/categories/infrastructure/database/category.entity';
import { PlannedExpenseEntity } from '@/modules/api/modules/expenses/infrastructure/database/expenses-planned.entity';
import { IncomesEntity } from '@/modules/api/modules/incomes/infrstructure/database/entities/incomes.entity';
import { PlannedIncomeEntity } from '@/modules/api/modules/incomes/infrstructure/database/entities/incomes-planned.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { Transaction } from '../../../domain/transaction';

@Entity('transactions')
@Unique(['plannedIncomeId'])
@Unique(['plannedExpenseId'])
@Unique(['plannedSavingId'])
export class TransactionEntity implements Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount: number;
  @Column()
  source: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'user_id', nullable: false })
  userId: string;
  @Column({ name: 'budget_id', nullable: false })
  budgetId: string;

  @Column({ name: 'bill_id', nullable: true })
  billId: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  @Column({
    type: 'enum',
    enum: ['income', 'expense', 'savings', 'interest'],
    name: 'type',
    nullable: false,
  })
  type: 'income' | 'expense' | 'savings' | 'interest';
  @ManyToOne(() => UserEntity, (user) => user.transactions, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
  @ManyToOne(() => BudgetEntity, (budget) => budget.transactions, {
    onDelete: 'CASCADE',
  })
  budget: BudgetEntity;

  @ManyToOne(() => CategoryEntity, { nullable: true })
  category?: CategoryEntity;
  @ManyToOne(() => IncomesEntity, { nullable: true })
  incomeSource: IncomesEntity;
  @ManyToOne(() => BillsEntity, { nullable: true })
  @JoinColumn({ name: 'bill_id', referencedColumnName: 'id' })
  bill: BillsEntity;
  @ManyToOne(() => AccountEntity, { nullable: true })
  @JoinColumn({ name: 'account_id', referencedColumnName: 'id' })
  account: AccountEntity;

  @Column({ name: 'account_id', nullable: true })
  accountId?: string;

  @Column({ name: 'from_account_id', nullable: true })
  fromAccountId?: string;
  @ManyToOne(() => AccountEntity, { nullable: true })
  @JoinColumn({ name: 'from_account_id', referencedColumnName: 'id' })
  fromAccount?: AccountEntity;

  @Column({ name: 'to_account_id', nullable: true })
  toAccountId?: string;
  @ManyToOne(() => AccountEntity, { nullable: true })
  @JoinColumn({ name: 'to_account_id', referencedColumnName: 'id' })
  toAccount?: AccountEntity;

  @Column({ name: 'planned_expense_id', nullable: true })
  plannedExpenseId?: string;
  @ManyToOne(() => PlannedExpenseEntity, { nullable: true })
  @JoinColumn({ name: 'planned_expense_id' })
  plannedExpense?: PlannedExpenseEntity;

  @Column({ name: 'planned_income_id', nullable: true })
  plannedIncomeId?: string;

  @Column({ name: 'saving_goal_id', nullable: true })
  savingGoalId?: string;

  @Column({ name: 'planned_saving_id', nullable: true })
  plannedSavingId?: string;

  @ManyToOne(() => PlannedIncomeEntity, { nullable: true })
  @JoinColumn({ name: 'planned_income_id' })
  plannedIncome?: PlannedIncomeEntity;
  @Column({ type: 'date', name: 'transaction_date', nullable: false })
  transactionDate: Date;
  @Column({ type: 'date', name: 'nulled_at', nullable: true })
  nulledAt?: Date;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
