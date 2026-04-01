import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from '../../domain/account';
import { AccountRepository } from '../../domain/repositories/account.respository';
import { AccountEntity } from '../database/account.entity';
import { AccountMapper } from '../mapper/account.mapper';

export class AccountRepositoryImpl implements AccountRepository {
  constructor(
    @InjectRepository(AccountEntity) private readonly accountRepository: Repository<AccountEntity>,
  ) {}
  async add(data: Account): Promise<Account> {
    const result = await this.accountRepository.save(data);
    return AccountMapper.toDomain(result);
  }
  async get(userId: string): Promise<Account[]> {
    const result = await this.accountRepository.find({ where: { userId } });
    return result.map((item) => AccountMapper.toDomain(item));
  }
}
