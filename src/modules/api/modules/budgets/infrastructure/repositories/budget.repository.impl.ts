import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { Budget } from '../../domain/budget';
import { BudgetRepository } from '../../domain/repositories/budget.repository';
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
        throw new Error(`Budget not found: ${budgetId}`);
      }

      const updated = await this.findById(budgetId);

      if (!updated) {
        throw new Error(`Budget not found after update: ${budgetId}`);
      }

      return updated;
    } catch (error) {
      this.logger.error(this.context, JSON.stringify(error));
      throw error;
    }
  }

  private getMonthNumber(month: string): number {
    return this.monthOrder[month.toLowerCase()] ?? 0;
  }
}
