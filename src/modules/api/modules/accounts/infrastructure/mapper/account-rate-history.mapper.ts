import { AccountRateHistory } from '../../domain/account-rate-history';
import { AccountRateHistoryEntity } from '../database/account-rate-history.entity';

export class AccountRateHistoryMapper {
  static toDomain(entity: AccountRateHistoryEntity): AccountRateHistory {
    return {
      id: entity.id,
      accountId: entity.accountId,
      previousRate: Number(entity.previousRate),
      newRate: Number(entity.newRate),
      changedAt: entity.changedAt,
      createdAt: entity.createdAt,
    };
  }

  static toEntity(
    domain: Omit<AccountRateHistory, 'id' | 'createdAt'>,
  ): Partial<AccountRateHistoryEntity> {
    return {
      accountId: domain.accountId,
      previousRate: domain.previousRate,
      newRate: domain.newRate,
      changedAt: domain.changedAt,
    };
  }
}
