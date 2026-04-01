import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { SavingAllocationRepository } from '../../domain/repositories/allocation.repository';
import { SavingAllocation } from '../../domain/savings-allocations';

@Injectable()
export class SavingAllocationService {
  private readonly context: string = SavingAllocationService.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('SavingAllocationRepository')
    private readonly allocationRepository: SavingAllocationRepository,
  ) {}
  async create(data: SavingAllocation): Promise<SavingAllocation> {
    this.logger.info(this.context, 'Creating saving allocation');
    return await this.allocationRepository.create(data);
  }

  async find(budgetId: string): Promise<SavingAllocation[]> {
    this.logger.info(this.context, `getting saving allocation by budgetId: ${budgetId}`);
    return await this.allocationRepository.find(budgetId);
  }
}
