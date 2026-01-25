import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { AccountRepository } from '../domain/account.repository';

@Injectable()
export class AccountService {
  private readonly context: string = AccountService.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('AccountRepository') private readonly accountRepository: AccountRepository,
  ) {}

  async getAccountById(accountId: string) {
    this.logger.info(this.context, `Getting account with id: ${accountId}`);
    return await this.accountRepository.findById(accountId);
  }
}
