import { PlannedExpense, PlannedExpenseStatus } from '../../domain/expenses';
import { PlannedExpenseEntity } from '../database/expenses-planned.entity';

export class ExpenseMapper {
  static toDomain(entity: PlannedExpenseEntity): PlannedExpense {
    return {
      id: entity.id,
      name: entity.name,
      budgetId: entity.budgetId,
      categoryId: entity.categoryId,
      expectedAmount: entity.expectedAmount,
      isEssential: entity.isEssential,
      status: entity.status as PlannedExpenseStatus,
      dueDate: entity.dueDate,
      notes: entity.notes,
      billsId: entity.billsId,
      groupId: entity.groupId,
      customBucketId: entity.customBucketId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toEntity(data: Partial<PlannedExpense>): PlannedExpenseEntity {
    const entity = new PlannedExpenseEntity();

    if (data.id) entity.id = data.id; // ← necesario para updates

    entity.name = data.name as string;
    entity.budgetId = data.budgetId as string;
    entity.categoryId = data.categoryId as string;
    entity.expectedAmount = data.expectedAmount as number;
    entity.isEssential = data.isEssential as boolean;
    entity.status = data.status as PlannedExpenseStatus;
    entity.dueDate = data.dueDate as Date;
    entity.notes = data.notes;
    entity.billsId = data.billsId?.trim().length ? data.billsId : undefined;
    entity.groupId = data.groupId ?? undefined;
    entity.customBucketId = data.customBucketId ?? undefined;

    return entity;
  }
}
