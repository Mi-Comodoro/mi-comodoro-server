import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { Budget } from '../../domain/budget';
import {
  BudgetHistoricalSummary,
  BudgetRepository,
} from '../../domain/repositories/budget.repository';
import { BudgetEntity } from '../database/entities/budget.entity';

@Injectable()
export class BudgetRepositoryImpl implements BudgetRepository {
  private readonly context: string = BudgetRepositoryImpl.name;
  private readonly monthOrder: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };

  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetRepository: Repository<BudgetEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async save(budget: Partial<Budget>): Promise<Budget> {
    const budgetEntity = this.budgetRepository.create(budget);
    const savedBudget = await this.budgetRepository.save(budgetEntity);
    this.logger.log(`Budget saved with ID: ${savedBudget.id}`);
    return savedBudget;
  }

  async findByFinancesIdAndMonth(
    financesId: string,
    month: string,
    year: number,
  ): Promise<Budget | null> {
    this.logger.info(
      this.context,
      `Finding budget for financesId: ${financesId}, month: ${month}, year: ${year}`,
    );
    const budget = await this.budgetRepository.findOne({
      where: { financesId, month, year },
    });
    return budget ?? null;
  }

  async findPreviousByFinancesId(
    financesId: string,
    month: string,
    year: number,
  ): Promise<Budget | null> {
    this.logger.info(
      this.context,
      `Finding previous budget for financesId: ${financesId}, month: ${month}, year: ${year}`,
    );

    const budgets = await this.budgetRepository.find({ where: { financesId } });
    const currentMonthNumber = this.getMonthNumber(month);

    const candidates = budgets.filter((budget) => {
      const budgetMonthNumber = this.getMonthNumber(budget.month);

      return budget.year < year || (budget.year === year && budgetMonthNumber < currentMonthNumber);
    });

    if (!candidates.length) {
      return null;
    }

    candidates.sort((left, right) => {
      if (left.year !== right.year) {
        return right.year - left.year;
      }

      return this.getMonthNumber(right.month) - this.getMonthNumber(left.month);
    });

    return candidates[0] ?? null;
  }

  async findAllByFinancesId(financesId: string, year?: number): Promise<Budget[]> {
    this.logger.info(
      this.context,
      `Finding all budgets for financesId: ${financesId}${year ? `, year: ${year}` : ''}`,
    );
    const where: Record<string, unknown> = { financesId };
    if (year !== undefined) {
      where.year = year;
    }
    const budgets = await this.budgetRepository.find({ where });

    return budgets;
  }

  async findHistoricalSummaryByFinancesId(
    financesId: string,
    year: number,
  ): Promise<BudgetHistoricalSummary[]> {
    this.logger.info(
      this.context,
      `Finding historical budget summary for financesId: ${financesId}, year: ${year}`,
    );

    const rows = (await this.budgetRepository.query(
      `
        SELECT
          budget.month AS "month",
          budget.year AS "year",
          budget.status AS "status",
          (
            SELECT COALESCE(SUM(planned_income.amount), 0)
            FROM incomes_planned planned_income
            WHERE CAST(planned_income.budget_id AS text) = CAST(budget.id AS text)
          ) AS "expectedIncome",
          (
            SELECT COALESCE(SUM(transaction.amount), 0)
            FROM transactions transaction
            WHERE CAST(transaction.budget_id AS text) = CAST(budget.id AS text)
              AND transaction.type = $1
          ) AS "receivedIncome",
          (
            SELECT COALESCE(SUM(transaction.amount), 0)
            FROM transactions transaction
            WHERE CAST(transaction.budget_id AS text) = CAST(budget.id AS text)
              AND transaction.type = $2
          ) AS "totalExpenses",
          (
            SELECT COALESCE(SUM(planned_saving.amount), 0)
            FROM planned_savings planned_saving
            WHERE CAST(planned_saving."budgetId" AS text) = CAST(budget.id AS text)
              AND planned_saving.status = $3
          ) AS "totalSavings"
        FROM budgets budget
        WHERE CAST(budget.finances_id AS text) = CAST($4 AS text)
          AND budget.year = $5
        ORDER BY
          budget.year ASC,
          CASE LOWER(budget.month)
            WHEN 'enero' THEN 1
            WHEN 'febrero' THEN 2
            WHEN 'marzo' THEN 3
            WHEN 'abril' THEN 4
            WHEN 'mayo' THEN 5
            WHEN 'junio' THEN 6
            WHEN 'julio' THEN 7
            WHEN 'agosto' THEN 8
            WHEN 'septiembre' THEN 9
            WHEN 'octubre' THEN 10
            WHEN 'noviembre' THEN 11
            WHEN 'diciembre' THEN 12
            ELSE 13
          END ASC
      `,
      ['income', 'expense', 'completed', financesId, year],
    )) as Array<{
      month: string;
      year: string;
      status: string;
      expectedIncome: string;
      receivedIncome: string;
      totalExpenses: string;
      totalSavings: string;
    }>;

    return rows.map((row) => ({
      month: row.month,
      year: Number(row.year),
      status: row.status,
      expectedIncome: Number(row.expectedIncome ?? 0),
      receivedIncome: Number(row.receivedIncome ?? 0),
      totalExpenses: Number(row.totalExpenses ?? 0),
      totalSavings: Number(row.totalSavings ?? 0),
    }));
  }

  async findById(budgetId: string): Promise<Budget | null> {
    this.logger.info(this.context, `Finding budget with ID: ${budgetId}`);
    const budget = await this.budgetRepository.findOne({ where: { id: budgetId } });

    return budget ?? null;
  }

  async active(budgetId: string): Promise<Budget> {
    this.logger.info(this.context, `Enabled budget with ID: ${budgetId}`);

    try {
      const result = await this.budgetRepository.update({ id: budgetId }, { status: 'ACTIVE' });

      if (!result.affected) {
        throw new NotFoundException(`Budget not found: ${budgetId}`);
      }

      const updated = await this.findById(budgetId);

      if (!updated) {
        throw new NotFoundException(`Budget not found after update: ${budgetId}`);
      }

      return updated;
    } catch (error) {
      this.logger.error(this.context, JSON.stringify(error));
      throw error;
    }
  }
  async close(budgetId: string): Promise<Budget> {
    this.logger.info(this.context, `Closing budget with ID: ${budgetId}`);

    try {
      const result = await this.budgetRepository.update(
        { id: budgetId },
        { status: 'CLOSED', closedAt: new Date() },
      );

      if (!result.affected) {
        throw new NotFoundException(`Budget not found: ${budgetId}`);
      }

      const updated = await this.findById(budgetId);

      if (!updated) {
        throw new NotFoundException(`Budget not found after update: ${budgetId}`);
      }

      return updated;
    } catch (error) {
      this.logger.error(this.context, JSON.stringify(error));
      throw error;
    }
  }

  async findActiveExpired(currentYear: number, currentMonth: number): Promise<Budget[]> {
    this.logger.info(
      this.context,
      `Finding active expired budgets before ${currentYear}-${currentMonth}`,
    );

    const rows = await this.budgetRepository.query(
      `
      SELECT * FROM budgets
      WHERE status = 'ACTIVE'
        AND (
          year < $1
          OR (
            year = $1
            AND CASE LOWER(month)
              WHEN 'enero'      THEN 1
              WHEN 'febrero'    THEN 2
              WHEN 'marzo'      THEN 3
              WHEN 'abril'      THEN 4
              WHEN 'mayo'       THEN 5
              WHEN 'junio'      THEN 6
              WHEN 'julio'      THEN 7
              WHEN 'agosto'     THEN 8
              WHEN 'septiembre' THEN 9
              WHEN 'octubre'    THEN 10
              WHEN 'noviembre'  THEN 11
              WHEN 'diciembre'  THEN 12
              ELSE 0
            END < $2
          )
        )
      `,
      [currentYear, currentMonth],
    );

    return rows as Budget[];
  }

  async findClosedByFinancesId(financesId: string): Promise<Budget[]> {
    this.logger.info(this.context, `Finding closed budgets for financesId: ${financesId}`);
    return this.budgetRepository.find({ where: { financesId, status: 'CLOSED' } });
  }

  private getMonthNumber(month: string): number {
    return this.monthOrder[month.toLowerCase()] ?? 0;
  }
}
