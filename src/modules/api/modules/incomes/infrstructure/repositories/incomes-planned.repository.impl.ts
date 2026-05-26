import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlannedIncome } from '../../domain/income-planned';
import { IncomeSource } from '../../domain/incomes';
import { PlannedIncomeRepository } from '../../domain/repositories/incomes-planned.repository';
import { PlannedIncomeEntity } from '../database/entities/incomes-planned.entity';
import { PlannedIncomeMapper } from '../mapper/planned-income.mapper';

@Injectable()
export class PlannedIncomeRepositoryImpl implements PlannedIncomeRepository {
  private readonly context: string = PlannedIncomeRepositoryImpl.name;
  constructor(
    @InjectRepository(PlannedIncomeEntity)
    private readonly plannedIncomesRepository: Repository<PlannedIncomeEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async create(domain: Partial<PlannedIncome>): Promise<Partial<PlannedIncome>> {
    const entity = this.plannedIncomesRepository.create({
      budgetId: domain.budgetId,
      incomeSourceId: domain.incomeSourceId,
      source: domain.source,
      amount: domain.amount,
      date: domain.date,
      status: domain.status ?? 'PENDING',
    });

    const saved = await this.plannedIncomesRepository.save(entity);
    const complete = await this.plannedIncomesRepository.findOne({
      where: { id: saved.id },
      relations: { incomeSource: true },
    });

    return PlannedIncomeMapper.toDomain(complete ?? saved);
  }

  async generateIncomesPlannedForBudget(
    budgetId: string,
    incomes: IncomeSource[],
    year: number,
    month: number,
  ): Promise<void> {
    this.logger.info(this.context, 'Frecuencia' + ' ' + incomes);
    const plannedIncomes: PlannedIncomeEntity[] = [];
    for (const source of incomes) {
      const { amount, frequency, paymentDays } = source;

      if (frequency === 'monthly') {
        const date = new Date(year, month - 1, paymentDays[0]);

        plannedIncomes.push(
          this.plannedIncomesRepository.create({
            budgetId,
            incomeSourceId: source.id,
            source: source.source,
            incomeSource: source,
            amount,
            date,
            status: 'PENDING',
          }),
        );
      }
      if (frequency === 'biweekly') {
        const splitAmount = amount / paymentDays.length;

        for (const day of paymentDays) {
          const date = new Date(year, month - 1, day);

          plannedIncomes.push(
            this.plannedIncomesRepository.create({
              budgetId,
              incomeSourceId: source.id,
              source: source.source,
              incomeSource: source,
              amount: splitAmount,
              date,
              status: 'PENDING',
            }),
          );
        }
      }
    }
    await this.plannedIncomesRepository.save(plannedIncomes);
  }

  async findByBudgetId(budgetId: string): Promise<Partial<PlannedIncome & { source: string }>[]> {
    const budgetPlannedIncomes = await this.plannedIncomesRepository.find({
      where: { budgetId },
      relations: { incomeSource: true },
    });

    return budgetPlannedIncomes.map((item) => PlannedIncomeMapper.toDomain(item));
  }

  async findByBudgetAndUser(
    budgetId: string,
    userId: string,
  ): Promise<Partial<PlannedIncome & { source: string }>[]> {
    const results = await this.plannedIncomesRepository
      .createQueryBuilder('pi')
      .leftJoinAndSelect('pi.incomeSource', 'incomeSource')
      .innerJoin('pi.budget', 'budget')
      .where('pi.budget_id = :budgetId', { budgetId })
      .andWhere('budget.owner_id = :userId', { userId })
      .getMany();

    return results.map((item) => PlannedIncomeMapper.toDomain(item));
  }

  async findById(id: string): Promise<Partial<PlannedIncome & { source: string }> | null> {
    const plannedIncome = await this.plannedIncomesRepository.findOne({
      where: { id },
      relations: { incomeSource: true },
    });

    return plannedIncome ? PlannedIncomeMapper.toDomain(plannedIncome) : null;
  }

  async findAllPlanedIncomes(): Promise<Partial<PlannedIncome & { source: string }>[]> {
    const budgetPlannedIncomes = await this.plannedIncomesRepository.find({
      where: {},
      relations: { incomeSource: true },
    });

    return budgetPlannedIncomes.map((item) => PlannedIncomeMapper.toDomain(item));
  }

  async markAsReceive(
    id: string,
  ): Promise<Partial<PlannedIncome & { source: string }> | null | undefined> {
    try {
      const plannedIncome = await this.plannedIncomesRepository.findOne({
        where: { id },
        relations: { incomeSource: true },
      });
      if (!plannedIncome) {
        return null;
      }
      if (plannedIncome.status === 'RECEIVED') return;

      plannedIncome.status = 'RECEIVED';

      await this.plannedIncomesRepository.update({ id }, { ...plannedIncome });
      return PlannedIncomeMapper.toDomain(plannedIncome);
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.plannedIncomesRepository.delete({ id });
  }
}
