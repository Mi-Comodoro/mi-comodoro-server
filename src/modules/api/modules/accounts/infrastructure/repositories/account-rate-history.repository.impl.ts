import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountRateHistory } from '../../domain/account-rate-history';
import { AccountRateHistoryRepository } from '../../domain/repositories/account-rate-history.repository';
import { AccountRateHistoryEntity } from '../database/account-rate-history.entity';
import { AccountRateHistoryMapper } from '../mapper/account-rate-history.mapper';

@Injectable()
export class AccountRateHistoryRepositoryImpl implements AccountRateHistoryRepository {
  constructor(
    @InjectRepository(AccountRateHistoryEntity)
    private readonly rateHistoryRepository: Repository<AccountRateHistoryEntity>,
  ) {}

  async save(data: Omit<AccountRateHistory, 'id' | 'createdAt'>): Promise<AccountRateHistory> {
    const entityData = AccountRateHistoryMapper.toEntity(data);
    const result = await this.rateHistoryRepository.save(entityData);
    return AccountRateHistoryMapper.toDomain(result);
  }

  async findByAccount(accountId: string): Promise<AccountRateHistory[]> {
    const result = await this.rateHistoryRepository.find({
      where: { accountId },
      order: { changedAt: 'DESC' },
    });
    return result.map((item) => AccountRateHistoryMapper.toDomain(item));
  }
}
