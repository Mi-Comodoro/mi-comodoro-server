import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { IncomesRepository } from '../../domain/repositories/incomes.repository';

@Injectable()
export class IncomesService {
  private readonly context: string = IncomesService.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('IncomesRepository') private readonly incomesRepository: IncomesRepository,
  ) {}
  // Aquí puedes agregar métodos para manejar la lógica de ingresos
  async calculateMonthlyIncomeSum(
    userId: string,
    month: number,
    year: number,
  ): Promise<{
    expectedIncomes: { source: string; amount: number; date: Date }[];
    totalExpectedIncomes: number;
    lastUpdate: Date;
  }> {
    this.logger.info(
      this.context,
      `Calculating monthly income sum for month: ${month}, year: ${year}`,
    );

    const incomes = await this.incomesRepository.findCurrentMonthIncomes(userId, month, year);
    this.logger.info(
      this.context,
      `Found ${incomes.expectedIncomes.length} income sources for month: ${month}, year: ${year}`,
    );

    return incomes;
  }
}
