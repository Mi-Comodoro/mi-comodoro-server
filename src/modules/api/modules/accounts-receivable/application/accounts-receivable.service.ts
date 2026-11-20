import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import type { AccountReceivable } from '../domain/account-receivable';
import {
  AccountReceivableRepository,
  AccountReceivableSummaryData,
} from '../domain/repositories/account-receivable.repository';
import { CreateAccountReceivableDto } from '../infrastructure/dto/create-account-receivable.dto';
import { CreateCollectionDto } from '../infrastructure/dto/create-collection.dto';
import { UpdateAccountReceivableDto } from '../infrastructure/dto/update-account-receivable.dto';

@Injectable()
export class AccountsReceivableService {
  private readonly context = AccountsReceivableService.name;

  constructor(
    @Inject('AccountReceivableRepository')
    private readonly repository: AccountReceivableRepository,
    private readonly logger: LoggerProviderService,
  ) {}

  async findAll(userId: string): Promise<AccountReceivable[]> {
    this.logger.info(this.context, `Finding all accounts receivable for user: ${userId}`);
    return this.repository.findAll(userId);
  }

  async findOne(id: string, userId: string): Promise<AccountReceivable> {
    this.logger.info(this.context, `Finding account receivable: ${id}`);
    const ar = await this.repository.findOne(id, userId);
    if (!ar) {
      throw new NotFoundException('Account receivable not found');
    }
    return ar;
  }

  async create(userId: string, dto: CreateAccountReceivableDto): Promise<AccountReceivable> {
    this.logger.info(this.context, `Creating account receivable for user: ${userId}`);
    return this.repository.create({
      userId,
      name: dto.name,
      description: dto.description,
      debtor: dto.debtor,
      originalAmount: dto.originalAmount,
      currentBalance: dto.originalAmount,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: 'pending',
      nulledAt: null,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateAccountReceivableDto,
  ): Promise<AccountReceivable> {
    this.logger.info(this.context, `Updating account receivable: ${id}`);
    const existing = await this.repository.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Account receivable not found');
    }

    const updated = await this.repository.update(id, {
      name: dto.name,
      description: dto.description,
      debtor: dto.debtor,
      originalAmount: dto.originalAmount,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    if (!updated) {
      throw new NotFoundException('Account receivable not found after update');
    }

    return updated;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Soft deleting account receivable: ${id}`);
    const existing = await this.repository.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Account receivable not found');
    }
    await this.repository.softDelete(id);
  }

  async registerCollection(id: string, userId: string, dto: CreateCollectionDto): Promise<void> {
    this.logger.info(this.context, `Registering collection for account receivable: ${id}`);
    const existing = await this.repository.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Account receivable not found');
    }
    await this.repository.registerCollection(
      id,
      dto.amount,
      new Date(dto.collectionDate),
      dto.notes,
    );
  }

  async autoCollect(
    id: string,
    amount: number,
    collectionDate: Date,
    notes?: string,
  ): Promise<void> {
    this.logger.info(this.context, `Auto-collecting account receivable: ${id}`);
    await this.repository.registerCollection(id, amount, collectionDate, notes);
  }

  async findByIdInternal(id: string): Promise<AccountReceivable | null> {
    return this.repository.findById(id);
  }

  async setLinkedCxp(id: string, linkedCxpId: string): Promise<void> {
    this.logger.info(this.context, `Setting linked CxP ${linkedCxpId} on CxC ${id}`);
    await this.repository.setLinkedCxp(id, linkedCxpId);
  }

  async getSummary(userId: string): Promise<AccountReceivableSummaryData> {
    this.logger.info(this.context, `Getting summary for user: ${userId}`);
    return this.repository.getSummaryData(userId);
  }
}
