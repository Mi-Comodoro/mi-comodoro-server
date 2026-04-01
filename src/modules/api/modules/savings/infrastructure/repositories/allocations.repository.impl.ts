import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SavingAllocationRepository } from '../../domain/repositories/allocation.repository';
import { SavingAllocation } from '../../domain/savings-allocations';
import { SavingAllocationEntity } from '../database/entities/saving-allocations.entity';
import { SavingAllocationMapper } from '../mapper/allocation.mapper';

export class SavingAllocationRepositoryImpl implements SavingAllocationRepository {
  constructor(
    @InjectRepository(SavingAllocationEntity)
    private readonly savingsAllocationRepository: Repository<SavingAllocationEntity>,
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
}
