import { PlannedExpense } from '../../domain/expenses';
import { PlannedExpenseEntity } from '../database/expenses-planned.entity';

export class ExpenseMapper {
  static toDomain(entity: PlannedExpenseEntity): PlannedExpense {
    const data: PlannedExpense = {
      id: entity.id,
      name: entity.name,
      budgetId: entity.budgetId,
      categoryId: entity.categoryId,
      expectedAmount: entity.expectedAmount,
      isEssential: entity.isEssential,
      status: entity.status,
      dueDate: entity.dueDate,
      notes: entity.notes,
      billsId: entity.billsId,
    };
    return data;
  }
  static toEntity(data: PlannedExpense): PlannedExpenseEntity {
    const entity: PlannedExpenseEntity = new PlannedExpenseEntity();
    entity.name = data.name;
    entity.budgetId = data.budgetId;
    entity.categoryId = data.categoryId;
    entity.expectedAmount = data.expectedAmount;
    entity.isEssential = data.isEssential;
    entity.status = data.status as 'PLANNED' | 'PAID' | 'CANCELED' | 'SKIPPED';
    entity.dueDate = data.dueDate;
    entity.notes = data.notes;
    entity.billsId = data.billsId?.trim().length ? data.billsId : undefined;
    return entity;
  }
}
