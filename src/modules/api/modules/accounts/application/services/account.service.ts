import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { Account } from '../../domain/account';
import { AccountRepository } from '../../domain/repositories/account.respository';
import { AccountRateHistoryRepository } from '../../domain/repositories/account-rate-history.repository';
import { UpdateAccountDto } from '../../infrastructure/dto/update-account.dto';

@Injectable()
export class AccountService {
  private readonly context: string = AccountService.name;
  constructor(
    private readonly logger: LoggerProviderService,

    @Inject('AccountRepository') private readonly accountRepository: AccountRepository,
    @Inject('AccountRateHistoryRepository')
    private readonly rateHistoryRepository: AccountRateHistoryRepository,
  ) {}
  async create(data: Account) {
    this.logger.info(this.context, 'create saving account');
    return await this.accountRepository.add(data);
  }

  async get(userId: string) {
    this.logger.info(this.context, 'get saving account');
    return await this.accountRepository.get(userId);
  }

  async update(id: string, userId: string, dto: UpdateAccountDto): Promise<Account> {
    this.logger.info(this.context, 'update saving account');

    const existing = await this.accountRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    // Si cambia interestRate → guardar historial ANTES de actualizar
    if (dto.interestRate !== undefined && dto.interestRate !== Number(existing.interestRate)) {
      await this.rateHistoryRepository.save({
        accountId: id,
        previousRate: Number(existing.interestRate),
        newRate: dto.interestRate,
        changedAt: new Date(),
      });
      this.logger.info(this.context, `Interest rate change recorded for account ${id}`);
    }

    const updated = await this.accountRepository.update(id, userId, dto);
    if (!updated) {
      throw new NotFoundException(`Failed to update account ${id}`);
    }

    return updated;
  }

  async getRateHistory(accountId: string, userId: string) {
    this.logger.info(this.context, 'get rate history for account');

    // Validar que la cuenta pertenece al usuario
    const account = await this.accountRepository.findByIdAndUser(accountId, userId);
    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    return await this.rateHistoryRepository.findByAccount(accountId);
  }
}
