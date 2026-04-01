import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggerProviderService } from '@/core/providers';
import { OnboardingPayload } from '@/modules/api/modules/users/domain/onboarding.types';

import { IncomeSource } from '../../domain/incomes';
import { IncomesRepository } from '../../domain/repositories/incomes.repository';
import { PlannedIncomeRepository } from '../../domain/repositories/incomes-planned.repository';

@Injectable()
export class OnboardingIncomesListener {
  private readonly context: string = OnboardingIncomesListener.name;

  constructor(
    @Inject('IncomesRepository') private readonly incomeSourceRepository: IncomesRepository,
    @Inject('PlannedIncomeRepository')
    private readonly plannedIncomeRepository: PlannedIncomeRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerProviderService,
  ) {}

  @OnEvent('budget.setup.completed')
  async setupIncomes(payload: OnboardingPayload) {
    try {
      this.logger.info(
        this.context,
        `IncomesModule: Creating income sources for user ${payload.userId}`,
      );
      const incomes = payload.data.incomes;

      this.logger.info(
        this.context,
        `IncomesModule: Received ${incomes.length} income sources for user ${payload.userId}`,
      );

      const createdIncomes: IncomeSource[] = [];
      for await (const incomeData of incomes) {
        const newIncomes = {
          userId: payload.userId,
          amount: incomeData.amount,
          source: incomeData.source,
          frequency: incomeData.frequency ?? 'monthly',
          paymentDays: incomeData.paymentDays,
          isActive: incomeData.isActive,
        };
        createdIncomes.push(newIncomes);
      }
      const incomesData = await this.incomeSourceRepository.bulkCreate(createdIncomes);

      if (createdIncomes.length === 0) {
        this.logger.warn(
          this.context,
          `IncomesModule: No income sources were created for user ${payload.userId}`,
        );
      } else {
        this.logger.info(
          this.context,
          `IncomesModule: Income sources created for user ${payload.userId}`,
        );
        const year = payload.budget?.year as number;
        const monthMap: Record<string, number> = {
          enero: 0,
          febrero: 1,
          marzo: 2,
          abril: 3,
          mayo: 4,
          junio: 5,
          julio: 6,
          agosto: 7,
          septiembre: 8,
          octubre: 9,
          noviembre: 10,
          diciembre: 11,
        };
        const monthName = payload.budget?.month as string;
        const monthIndex = monthMap[monthName.toLowerCase()];
        const currentMonth = new Date(year, monthIndex, 1);

        const budgetId = payload.budget?.id;

        this.logger.info(
          this.context,
          `IncomesModule: planned income creating for budget ${budgetId}`,
        );
        await this.plannedIncomeRepository.generateIncomesPlannedForBudget(
          budgetId as string,
          incomesData,
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
        );

        this.logger.info(
          this.context,
          `IncomesModule: planned income created for budget ${budgetId}`,
        );
        await this.eventEmitter.emitAsync('onboarding.completed', {
          userId: payload.userId,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(this.context, `Incomes setup failed: ${errorMessage}`);
      await this.eventEmitter.emitAsync('onboarding.rollback', {
        userId: payload.userId,
        step: 'incomes',
        error,
      });
    }
  }
}
