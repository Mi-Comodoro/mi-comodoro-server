import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '@/modules/api/modules/accounts/infrastructure/database/account.entity';

import {
  GoalSavedTotal,
  PlannedSavingRepository,
  SavingsTrendPoint,
} from '../../domain/repositories/planned.repository';
import { PlannedSaving, PlannedSavingStatus } from '../../domain/savings-planned';
import { SavingGoalEntity } from '../database/entities/saving-goals.entity';
import { PlannedSavingEntity } from '../database/entities/saving-planned.entity';
import { PlannedSavingMapper } from '../mapper/planned.mapper';

@Injectable()
export class PlannedSavingRepositoryImpl implements PlannedSavingRepository {
  constructor(
    @InjectRepository(PlannedSavingEntity)
    private readonly plannedSavingRepository: Repository<PlannedSavingEntity>,
  ) {}

  async save(domain: Partial<PlannedSaving>): Promise<PlannedSaving> {
    const entity = PlannedSavingMapper.toEntity(domain);
    const saved = await this.plannedSavingRepository.save(entity);
    return PlannedSavingMapper.toDomain(saved);
  }

  async saveMany(domain: Partial<PlannedSaving>[]): Promise<PlannedSaving[]> {
    const entities = domain.map((item) => PlannedSavingMapper.toEntity(item));
    const saved = await this.plannedSavingRepository.save(entities);
    return saved.map(PlannedSavingMapper.toDomain);
  }

  async findById(id: string): Promise<PlannedSaving | null> {
    const entity = await this.plannedSavingRepository.findOne({
      where: { id },
      relations: { account: true, plannedIncome: true, budget: true, savingGoal: true },
    });

    if (!entity) return null;

    return PlannedSavingMapper.toDomain(entity);
  }

  async findByBudget(budgetId: string): Promise<PlannedSaving[]> {
    const entities = await this.plannedSavingRepository.find({
      where: { budget: { id: budgetId } },
      relations: { account: true, savingGoal: true, plannedIncome: true, budget: true },
      order: { date: 'DESC' },
    });

    return entities.map(PlannedSavingMapper.toDomain);
  }

  async findByGoalId(goalId: string): Promise<PlannedSaving[]> {
    const entities = await this.plannedSavingRepository.find({
      where: { savingGoal: { id: goalId } },
      relations: { account: true, savingGoal: true, plannedIncome: true, budget: true },
      order: { date: 'ASC' },
    });

    return entities.map(PlannedSavingMapper.toDomain);
  }

  async update(id: string, domain: Partial<PlannedSaving>): Promise<PlannedSaving | null> {
    const scalarData: Partial<PlannedSavingEntity> = {};
    let hasScalarChanges = false;
    let hasRelationChanges = false;

    if (domain.status !== undefined) {
      scalarData.status = domain.status as PlannedSavingStatus;
      hasScalarChanges = true;
    }
    if (domain.completedAt !== undefined) {
      scalarData.completedAt = domain.completedAt;
      hasScalarChanges = true;
    }

    if (hasScalarChanges) {
      const result = await this.plannedSavingRepository.update(id, scalarData);
      if (result.affected === 0) return null;
    }

    if (domain.savingGoalId !== undefined || domain.accountId !== undefined) {
      hasRelationChanges = true;
      const entity = await this.plannedSavingRepository.findOne({ where: { id } });
      if (!entity) return null;

      if (domain.savingGoalId !== undefined) {
        const goal = new SavingGoalEntity();
        goal.id = domain.savingGoalId;
        entity.savingGoal = goal;
      }
      if (domain.accountId !== undefined) {
        const account = new AccountEntity();
        account.id = domain.accountId;
        entity.account = account;
      }

      await this.plannedSavingRepository.save(entity);
    }

    if (!hasScalarChanges && !hasRelationChanges) return null;

    return this.findById(id);
  }

  async sumCompletedByGoalIds(goalIds: string[]): Promise<GoalSavedTotal[]> {
    if (!goalIds.length) return [];
    const rows = await this.plannedSavingRepository
      .createQueryBuilder('ps')
      .innerJoin('ps.savingGoal', 'goal')
      .where('goal.id IN (:...goalIds)', { goalIds })
      .andWhere('ps.status = :status', { status: PlannedSavingStatus.COMPLETED })
      .select('goal.id', 'goalId')
      .addSelect('SUM(ps.amount)', 'total')
      .groupBy('goal.id')
      .getRawMany();
    return rows.map((r) => ({ goalId: r.goalId, total: Number(r.total) || 0 }));
  }

  async findCompletedLast6MonthsByUserId(userId: string): Promise<SavingsTrendPoint[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const entities = await this.plannedSavingRepository
      .createQueryBuilder('ps')
      .innerJoin('ps.budget', 'budget')
      .where('budget.ownerId = :userId', { userId })
      .andWhere('ps.status = :status', { status: PlannedSavingStatus.COMPLETED })
      .andWhere('ps.completed_at >= :since', { since })
      .select(['ps.amount', 'ps.completed_at'])
      .getMany();

    const grouped = new Map<string, number>();
    for (const entity of entities) {
      const month = new Date(entity.completedAt!).toLocaleString('es-CO', {
        month: 'short',
        year: '2-digit',
      });
      grouped.set(month, (grouped.get(month) ?? 0) + Number(entity.amount));
    }

    return Array.from(grouped.entries()).map(([month, amount]) => ({ month, amount }));
  }
}
