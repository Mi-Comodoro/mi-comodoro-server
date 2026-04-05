import { AccountEntity } from '../../../accounts/infrastructure/database/account.entity';
import { BudgetEntity } from '../../../budgets/infrastructure/database/entities/budget.entity';
import { PlannedIncomeEntity } from '../../../incomes/infrstructure/database/entities/incomes-planned.entity';
import { PlannedSaving, PlannedSavingStatus } from '../../domain/savings-planned';
import { SavingGoalEntity } from '../database/entities/saving-goals.entity';
import { PlannedSavingEntity } from '../database/entities/saving-planned.entity';

export class PlannedSavingMapper {
  static toDomain(entity: PlannedSavingEntity): PlannedSaving {
    return {
      id: entity.id,
      amount: Number(entity.amount),
      date: entity.date,
      status: entity.status,
      accountId: entity.account?.id,
      budgetId: entity.budget?.id,
      plannedIncomeId: entity.plannedIncome?.id,
      savingGoalId: entity.savingGoal?.id,
      account: entity.account ? { id: entity.account.id, name: entity.account.name } : undefined,
      savingGoal: entity.savingGoal
        ? {
            id: entity.savingGoal.id,
            name: entity.savingGoal.name,
            reason: entity.savingGoal.reason,
          }
        : undefined,
      plannedIncome: entity.plannedIncome
        ? {
            id: entity.plannedIncome.id,
            amount: Number(entity.plannedIncome.amount),
            date: entity.plannedIncome.date,
            source: entity.plannedIncome.source,
          }
        : undefined,
    };
  }

  static toEntity(domain: Partial<PlannedSaving>): PlannedSavingEntity {
    const entity = new PlannedSavingEntity();

    // Solo asignar id si existe (updates), nunca en creates
    if (domain.id) {
      entity.id = domain.id;
    }

    entity.amount = Number(domain.amount);
    entity.date = domain.date as Date;
    entity.status = domain.status as PlannedSavingStatus;

    // Relaciones: solo asignar si el ID existe
    if (domain.accountId) {
      const account = new AccountEntity();
      account.id = domain.accountId;
      entity.account = account;
    }

    if (domain.budgetId) {
      const budget = new BudgetEntity();
      budget.id = domain.budgetId;
      entity.budget = budget;
    }

    if (domain.plannedIncomeId) {
      const plannedIncome = new PlannedIncomeEntity();
      plannedIncome.id = domain.plannedIncomeId;
      entity.plannedIncome = plannedIncome;
    }

    if (domain.savingGoalId) {
      const savingGoal = new SavingGoalEntity();
      savingGoal.id = domain.savingGoalId;
      entity.savingGoal = savingGoal;
    }

    return entity;
  }
}
