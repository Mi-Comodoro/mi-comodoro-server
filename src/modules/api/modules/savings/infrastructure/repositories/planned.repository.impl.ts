import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PlannedSavingRepository } from '../../domain/repositories/planned.repository';
import { PlannedSaving, PlannedSavingStatus } from '../../domain/savings-planned';
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

  async update(id: string, domain: Partial<PlannedSaving>): Promise<PlannedSaving | null> {
    const updateData: Partial<PlannedSavingEntity> = {};

    if (domain.status !== undefined) {
      updateData.status = domain.status as PlannedSavingStatus;
    }
    if (domain.completedAt !== undefined) {
      updateData.completedAt = domain.completedAt;
    }

    const result = await this.plannedSavingRepository.update(id, updateData);

    if (result.affected === 0) return null;

    return this.findById(id);
  }
}
