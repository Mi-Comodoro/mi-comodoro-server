import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { Account } from '../../domain/account.entity';
import { AccountRepository } from '../../domain/account.repository';
import { AccountEntity } from '../database/account.entity';
@Injectable()
export class AccountRepositoryImpl implements AccountRepository {
  private readonly context: string = AccountRepositoryImpl.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @InjectRepository(AccountEntity)
    @Inject('AccountRepository')
    private readonly accountRepository: Repository<AccountEntity>,
  ) {}
  async save(account: Account): Promise<Account> {
    const TRIAL_DAYS = 14;
    const trialEndsAt = addDays(new Date(), TRIAL_DAYS);
    this.logger.info(this.context, 'Creating account');
    try {
      const newAccount = this.accountRepository.create({
        ...account,
        trialEndsAt,
      });
      const saved = (await this.accountRepository.save(newAccount)) as Account;
      return saved;
    } catch (error) {
      throw error;
    }
  }
  async findById(id: string): Promise<Account | null> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      return null;
    }
    return account as Account;
  }
}
