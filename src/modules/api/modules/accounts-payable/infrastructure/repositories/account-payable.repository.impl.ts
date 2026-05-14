import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThan, Repository } from 'typeorm';

import { AccountPayable } from '../../domain/account-payable';
import { AccountPayableRepository } from '../../domain/repositories/account-payable.repository';
import { AccountPayableEntity } from '../database/account-payable.entity';
import { AccountPayablePaymentEntity } from '../database/account-payable-payment.entity';
import { AccountPayableMapper } from '../mapper/account-payable.mapper';

export class AccountPayableRepositoryImpl implements AccountPayableRepository {
  constructor(
    @InjectRepository(AccountPayableEntity)
    private readonly accountPayableRepo: Repository<AccountPayableEntity>,
    @InjectRepository(AccountPayablePaymentEntity)
    private readonly paymentRepo: Repository<AccountPayablePaymentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(userId: string): Promise<AccountPayable[]> {
    const entities = await this.accountPayableRepo.find({
      where: { userId, nulledAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return entities.map(AccountPayableMapper.toDomain);
  }

  async findOne(id: string, userId: string): Promise<AccountPayable | null> {
    const entity = await this.accountPayableRepo.findOne({
      where: { id, userId, nulledAt: IsNull() },
    });
    if (!entity) return null;
    return AccountPayableMapper.toDomain(entity);
  }

  async create(
    data: Omit<AccountPayable, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AccountPayable> {
    const entity = AccountPayableMapper.toEntity({
      ...data,
      currentBalance: data.originalAmount,
    });
    const saved = await this.accountPayableRepo.save(entity);
    return AccountPayableMapper.toDomain(saved);
  }

  async update(id: string, data: Partial<AccountPayable>): Promise<AccountPayable | null> {
    const updateData: Partial<AccountPayableEntity> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.minimumPayment !== undefined) updateData.minimumPayment = data.minimumPayment;
    if (data.interestRate !== undefined) updateData.interestRate = data.interestRate;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.nextPaymentDate !== undefined) updateData.nextPaymentDate = data.nextPaymentDate;
    if (data.status !== undefined) updateData.status = data.status;

    const result = await this.accountPayableRepo.update(id, updateData);
    if (result.affected === 0) return null;

    const updated = await this.accountPayableRepo.findOne({ where: { id } });
    if (!updated) return null;
    return AccountPayableMapper.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.accountPayableRepo.update(id, { nulledAt: new Date() });
  }

  async registerPayment(
    accountPayableId: string,
    amount: number,
    paymentDate: Date,
    notes?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = new AccountPayablePaymentEntity();
      payment.accountPayableId = accountPayableId;
      payment.amount = amount;
      payment.paymentDate = paymentDate;
      if (notes) payment.notes = notes;

      await queryRunner.manager.save(AccountPayablePaymentEntity, payment);

      const account = await queryRunner.manager.findOne(AccountPayableEntity, {
        where: { id: accountPayableId },
      });

      if (!account) {
        throw new NotFoundException('Account payable not found');
      }

      let newBalance = Number(account.currentBalance) - amount;
      let newStatus: 'active' | 'paid' | 'overdue' = account.status;

      if (newBalance <= 0) {
        newBalance = 0;
        newStatus = 'paid';
      }

      await queryRunner.manager.update(AccountPayableEntity, accountPayableId, {
        currentBalance: newBalance,
        status: newStatus,
      });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getSummaryData(userId: string): Promise<{
    accounts: AccountPayable[];
    avgMonthlyIncome: number;
  }> {
    const accounts = await this.findAll(userId);

    // Compute average monthly income from transactions of type 'income'
    // across the last 3 closed budgets for this user
    const query = `SELECT AVG(budget_income) as avg_income FROM (
    SELECT b.id, COALESCE(SUM(t.amount), 0) as budget_income
    FROM budgets b
    LEFT JOIN transactions t ON t.budget_id::text = b.id::text AND t.type = 'income' AND t.nulled_at IS NULL
    WHERE b."ownerId"::text = $1::text AND b.status = 'CLOSED'
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT 3
  ) sub`;
    const result = await this.dataSource.query(query, [userId]);

    const avgMonthlyIncome = result[0]?.avg_income ? Number(result[0].avg_income) : 0;

    // Also update overdue status for accounts with past nextPaymentDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueAccounts = await this.accountPayableRepo.find({
      where: {
        userId,
        nulledAt: IsNull(),
        status: 'active',
        nextPaymentDate: LessThan(today),
      },
    });

    if (overdueAccounts.length > 0) {
      await this.accountPayableRepo
        .createQueryBuilder()
        .update(AccountPayableEntity)
        .set({ status: 'overdue' })
        .whereInIds(overdueAccounts.map((a) => a.id))
        .execute();

      // Refresh accounts after status update
      const refreshed = await this.findAll(userId);
      return { accounts: refreshed, avgMonthlyIncome };
    }

    return { accounts, avgMonthlyIncome };
  }
}
