// infrastructure/repositories/transaction.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction } from '../../domain/transaction';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { TransactionMapper } from '../mapper/transaction.mapper';

@Injectable()
export class TransactionRepositoryImpl implements TransactionRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
  ) {}

  async save(domain: Partial<Transaction>): Promise<Transaction> {
    const entity = TransactionMapper.toEntity(domain);
    const saved = await this.transactionRepository.save(entity);
    return TransactionMapper.toDomain(saved);
  }

  async findByBudget(budgetId: string, type?: Transaction['type']): Promise<Transaction[]> {
    const entities = await this.transactionRepository.find({
      where: {
        budgetId,
        ...(type && { type }),
      },
      relations: { category: true },
      order: { transactionDate: 'DESC' },
    });

    return entities.map(TransactionMapper.toDomain);
  }
}
