import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { getErrorMessage } from '@/common/helpers/error.helpers';
import { LoggerProviderService } from '@/core/providers';

import { SavingAllocationRepository } from '../../domain/repositories/allocation.repository';
import { SavingAllocation } from '../../domain/savings-allocations';
import { SavingAllocationEntity } from '../database/entities/saving-allocations.entity';
import { SavingAllocationMapper } from '../mapper/allocation.mapper';

@Injectable()
export class SavingAllocationRepositoryImpl implements SavingAllocationRepository {
  private readonly context: string = SavingAllocationRepositoryImpl.name;
  constructor(
    @InjectRepository(SavingAllocationEntity)
    private readonly savingsAllocationRepository: Repository<SavingAllocationEntity>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerProviderService,
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
    try {
      return await this.dataSource.transaction(async (manager) => {
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
    } catch (error) {
      this.logger.error(
        this.context,
        `Error reemplazando distribución de ahorro para budgetId=${budgetId}`,
        getErrorMessage(error),
      );
      throw error;
    }
  }
}
