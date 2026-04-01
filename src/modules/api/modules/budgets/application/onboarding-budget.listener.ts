import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingFinancesPayload } from '../../users/domain/onboarding.types';
import { Budget } from '../domain/budget';
import { BudgetRepository } from '../domain/repositories/budget.repository';

@Injectable()
export class OnboardingBudgetListener {
  private readonly context: string = OnboardingBudgetListener.name;

  constructor(
    @Inject('BudgetRepository')
    private readonly budgetRepository: BudgetRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerProviderService,
  ) {}

  @OnEvent('finances.setup.completed')
  async setupBudget(payload: OnboardingFinancesPayload) {
    try {
      this.logger.info(
        this.context,
        `BudgetModule: Creating initial budget for finances ${payload.financesId}`,
      );

      const currentDate = new Date();
      const monthName = currentDate
        .toLocaleString('es-ES', { month: 'long' })
        .replace(/^./, (str) => str.toUpperCase());

      const budget: Budget = {
        name: `Presupuesto_${monthName}_de_${currentDate.getFullYear()}`,
        month: monthName,
        year: currentDate.getFullYear(),
        isShared: payload.data.finances.usage === 'shared',
        financesId: payload.financesId || '',
        needsLimit: payload.data.budget.needs,
        wantsLimit: payload.data.budget.wants,
        savingsLimit: payload.data.budget.savings,
        strategy: payload.data.budget.strategy,
        frequency: payload.data.budget.budgetFrequency,
        status: 'PLANNED',
        ownerId: payload.userId,
      };

      const savedBudget = await this.budgetRepository.save(budget);

      this.logger.info(this.context, `Initial budget created with ID ${savedBudget.id}`);

      // Emitir evento para incomes antes de finalizar onboarding
      await this.eventEmitter.emitAsync('budget.setup.completed', {
        ...payload,
        budget: savedBudget,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(this.context, `Budget setup failed: ${errorMessage}`);
      await this.eventEmitter.emitAsync('onboarding.rollback', {
        userId: payload.userId,
        step: 'budget',
        error,
      });
    }
  }
}
