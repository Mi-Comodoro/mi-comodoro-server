import { Inject, Injectable } from '@nestjs/common';

import { PlannedSavingRepository } from '../../domain/repositories/planned.repository';
import { PlannedSaving } from '../../domain/savings-planned';

@Injectable()
export class PlannedSavingService {
  constructor(
    @Inject('PlannedSavingRepository')
    private readonly plannedSavingRepository: PlannedSavingRepository,
  ) {}

  async findByBudget(budgetId: string): Promise<PlannedSaving[]> {
    return await this.plannedSavingRepository.findByBudget(budgetId);
  }
}
