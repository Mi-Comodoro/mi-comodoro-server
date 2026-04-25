import { Account } from '../../domain/account';
import { AccountEntity } from '../database/account.entity';

export class AccountMapper {
  static toDomain(entity: AccountEntity): Account {
    return {
      id: entity.id,
      name: entity.name,
      interestRate: Number(entity.interestRate.toString()),
      description: entity.description,
      compoundingFrequency: entity.compoundingFrequency,
      isActive: entity.isActive,
      isPrimary: entity.isPrimary,
      type: entity.type,
      userId: entity.userId,
    };
  }
}
