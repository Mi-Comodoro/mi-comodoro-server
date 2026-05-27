import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { SavingAllocationRepository } from '../../domain/repositories/allocation.repository';
import { SavingAllocation } from '../../domain/savings-allocations';
import { SavingAllocationEntity } from '../database/entities/saving-allocations.entity';
import { SavingAllocationMapper } from '../mapper/allocation.mapper';

export class SavingAllocationRepositoryImpl implements SavingAllocationRepository {
  constructor(
    @InjectRepository(SavingAllocationEntity)
    private readonly savingsAllocationRepository: Repository<SavingAllocationEntity>,
    private readonly dataSource: DataSource,
  ) {}
  async create(data: SavingAllocation): Promise<SavingAllocation> {
    const result = await this.savingsAllocationRepository.save(data);
    return SavingAllocationMapper.toDomain(result);
  }
  async find(budgetId: string): Promise<SavingAllocation[]> {
    const result = await this.savingsAllocationRepository.find({
      where: { budgetId },
      relations: { goal: true },
    });
    return result.map((item) => SavingAllocationMapper.toDomain(item));
  }

  async replaceForBudget(
    budgetId: string,
    data: Omit<SavingAllocation, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<SavingAllocation[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(SavingAllocationEntity, { budgetId });
      const entities = data.map((item) =>
        manager.create(SavingAllocationEntity, { ...item, budgetId }),
      );
      const saved = await manager.save(SavingAllocationEntity, entities);
      const withRelations = await manager.find(SavingAllocationEntity, {
        where: saved.map((e) => ({ id: e.id })),
        relations: { goal: true },
      });
      return withRelations.map(SavingAllocationMapper.toDomain);
    });
  }
}
