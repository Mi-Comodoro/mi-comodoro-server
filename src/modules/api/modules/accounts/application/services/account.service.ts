import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { Account } from '../../domain/account';
import { AccountRepository } from '../../domain/repositories/account.respository';

@Injectable()
export class AccountService {
  private readonly context: string = AccountService.name;
  constructor(
    private readonly logger: LoggerProviderService,

    @Inject('AccountRepository') private readonly accountRepository: AccountRepository,
  ) {}
  async create(data: Account) {
    this.logger.info(this.context, 'create saving account');
    return await this.accountRepository.add(data);
  }

  async get(userId: string) {
    this.logger.info(this.context, 'get saving account');
    return await this.accountRepository.get(userId);
  }
}
