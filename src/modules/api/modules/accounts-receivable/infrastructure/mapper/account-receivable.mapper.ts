import { AccountReceivable } from '../../domain/account-receivable';
import { AccountReceivableEntity } from '../database/account-receivable.entity';

export class AccountReceivableMapper {
  static toDomain(entity: AccountReceivableEntity): AccountReceivable {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      description: entity.description,
      debtor: entity.debtor,
      originalAmount: Number(entity.originalAmount),
      currentBalance: Number(entity.currentBalance),
      dueDate: entity.dueDate,
      status: entity.status,
      linkedCxpId: entity.linkedCxpId,
      nulledAt: entity.nulledAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toEntity(data: Partial<AccountReceivable>): AccountReceivableEntity {
    const entity = new AccountReceivableEntity();

    // Never map id on creation (POST)
    if (data.id) entity.id = data.id;

    entity.userId = data.userId as string;
    entity.name = data.name as string;
    entity.description = data.description as string;
    entity.debtor = data.debtor as string;
    entity.originalAmount = data.originalAmount as number;
    entity.currentBalance = data.currentBalance as number;
    entity.dueDate = data.dueDate as Date;
    entity.status = data.status as 'pending' | 'partial' | 'collected' | 'overdue';
    entity.nulledAt = data.nulledAt ?? null;

    return entity;
  }
}
