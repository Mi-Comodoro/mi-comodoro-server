import { Bill } from '../../domain/bills';
import { BillsEntity } from '../database/bills.entity';

export class BillMapper {
  static toDomain(entity: BillsEntity): Bill {
    return {
      id: entity.id,
      userId: entity.userId,
      categoryId: entity.categoryId,
      name: entity.name,
      expectedAmount: Number(entity.expectedAmount),
      billingDay: entity.billingDay,
      frequency: entity.frequency,
      isActive: entity.isActive,
      isPaid: entity.isPaid,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toEntity(data: Partial<Bill>): BillsEntity {
    const entity = new BillsEntity();
    if (data.userId) entity.userId = data.userId;
    if (data.categoryId) entity.categoryId = data.categoryId;
    if (data.name !== undefined) entity.name = data.name;
    if (data.expectedAmount !== undefined) entity.expectedAmount = data.expectedAmount;
    if (data.billingDay !== undefined) entity.billingDay = data.billingDay;
    if (data.frequency !== undefined) entity.frequency = data.frequency;
    if (data.isActive !== undefined) entity.isActive = data.isActive;
    if (data.isPaid !== undefined) entity.isPaid = data.isPaid;
    return entity;
  }
}
