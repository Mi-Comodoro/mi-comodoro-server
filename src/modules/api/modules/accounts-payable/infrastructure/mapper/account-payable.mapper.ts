import { AccountPayable } from '../../domain/account-payable';
import { AccountPayableEntity } from '../database/account-payable.entity';

export class AccountPayableMapper {
  static toDomain(entity: AccountPayableEntity): AccountPayable {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      originalAmount: Number(entity.originalAmount),
      currentBalance: Number(entity.currentBalance),
      minimumPayment: entity.minimumPayment != null ? Number(entity.minimumPayment) : undefined,
      interestRate: entity.interestRate != null ? Number(entity.interestRate) : undefined,
      dueDate: entity.dueDate,
      nextPaymentDate: entity.nextPaymentDate,
      status: entity.status,
      linkedCxcId: entity.linkedCxcId,
      nulledAt: entity.nulledAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toEntity(data: Partial<AccountPayable>): AccountPayableEntity {
    const entity = new AccountPayableEntity();

    if (data.id) entity.id = data.id;
    if (data.userId !== undefined) entity.userId = data.userId;
    if (data.name !== undefined) entity.name = data.name;
    if (data.description !== undefined) entity.description = data.description;
    if (data.type !== undefined) entity.type = data.type;
    if (data.originalAmount !== undefined) entity.originalAmount = data.originalAmount;
    if (data.currentBalance !== undefined) entity.currentBalance = data.currentBalance;
    if (data.minimumPayment !== undefined) entity.minimumPayment = data.minimumPayment;
    if (data.interestRate !== undefined) entity.interestRate = data.interestRate;
    if (data.dueDate !== undefined) entity.dueDate = data.dueDate;
    if (data.nextPaymentDate !== undefined) entity.nextPaymentDate = data.nextPaymentDate;
    if (data.status !== undefined) entity.status = data.status;
    if (data.nulledAt !== undefined) entity.nulledAt = data.nulledAt;

    return entity;
  }
}
