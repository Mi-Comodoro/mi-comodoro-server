import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { BudgetRepository } from '../../../budgets/domain/repositories/budget.repository';
import { SavingAllocationRepository } from '../../domain/repositories/allocation.repository';
import { SavingAllocation } from '../../domain/savings-allocations';
import { SavingDistributionItemDto } from '../../infrastructure/dto/update-saving-distribution.dto';

@Injectable()
export class SavingAllocationService {
  private readonly context: string = SavingAllocationService.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('SavingAllocationRepository')
    private readonly allocationRepository: SavingAllocationRepository,
    @Inject('BudgetRepository')
    private readonly budgetRepository: BudgetRepository,
  ) {}
  async create(data: SavingAllocation): Promise<SavingAllocation> {
    this.logger.info(this.context, 'Creando asignación de ahorro');
    return await this.allocationRepository.create(data);
  }

  async find(budgetId: string): Promise<SavingAllocation[]> {
    this.logger.info(this.context, `Obteniendo asignaciones de ahorro para budget ${budgetId}`);
    return await this.allocationRepository.find(budgetId);
  }

  async replace(
    userId: string,
    budgetId: string,
    distributions: SavingDistributionItemDto[],
  ): Promise<SavingAllocation[]> {
    this.logger.info(this.context, `Reemplazando distribución de ahorro para budget ${budgetId}`);

    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget || budget.ownerId !== userId) {
      this.logger.warn(
        this.context,
        `Presupuesto no encontrado o sin acceso: budgetId=${budgetId}, userId=${userId}`,
      );
      throw new NotFoundException('Presupuesto no encontrado');
    }

    const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0);
    if (totalPercentage > 100) {
      this.logger.warn(
        this.context,
        `Suma de porcentajes inválida: ${totalPercentage}% para budgetId=${budgetId}`,
      );
      throw new BadRequestException(
        `La suma de porcentajes (${totalPercentage}%) no puede superar el 100%`,
      );
    }

    const data = distributions.map((d) => ({
      goalId: d.goalId,
      percentage: d.percentage,
      budgetId,
    }));
    const result = await this.allocationRepository.replaceForBudget(budgetId, data);

    this.logger.info(
      this.context,
      `Distribución actualizada para budget ${budgetId}: ${distributions.length} asignaciones, total ${totalPercentage}%`,
    );

    return result;
  }
}
