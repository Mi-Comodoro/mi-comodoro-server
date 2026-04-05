import { PlannedIncome } from '../../domain/income-planned';
import { PlannedIncomeEntity } from '../database/entities/incomes-planned.entity';

export class PlannedIncomeMapper {
  static toDomain(entity: PlannedIncomeEntity): Required<PlannedIncome> {
    const planned: Required<PlannedIncome> = {
      id: entity.id,
      amount: entity.amount,
      source: entity.incomeSource?.source ?? entity.source ?? 'Ingreso puntual',
      date: entity.date,
      status: entity.status,
      budgetId: entity.budgetId,
      updatedAt: entity.updatedAt,
      incomeSourceId: entity.incomeSourceId ?? '',
      createdAt: entity.createdAt,
    };

    return planned;
  }
  //static toEntity(planned: PlannedIncome): PlannedIncomeEntity {}
}
