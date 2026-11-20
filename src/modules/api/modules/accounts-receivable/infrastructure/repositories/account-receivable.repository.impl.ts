import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { AccountReceivable } from '../../domain/account-receivable';
import {
  AccountReceivableRepository,
  AccountReceivableSummaryData,
} from '../../domain/repositories/account-receivable.repository';
import { AccountReceivableEntity } from '../database/account-receivable.entity';
import { AccountReceivableCollectionEntity } from '../database/account-receivable-collection.entity';
import { AccountReceivableMapper } from '../mapper/account-receivable.mapper';

export class AccountReceivableRepositoryImpl implements AccountReceivableRepository {
  constructor(
    @InjectRepository(AccountReceivableEntity)
    private readonly arRepository: Repository<AccountReceivableEntity>,
    @InjectRepository(AccountReceivableCollectionEntity)
    private readonly collectionRepository: Repository<AccountReceivableCollectionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(userId: string): Promise<AccountReceivable[]> {
    const entities = await this.arRepository.find({
      where: { userId, nulledAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => AccountReceivableMapper.toDomain(e));
  }

  async findOne(id: string, userId: string): Promise<AccountReceivable | null> {
    const entity = await this.arRepository.findOne({
      where: { id, userId, nulledAt: IsNull() },
    });
    if (!entity) return null;
    return AccountReceivableMapper.toDomain(entity);
  }

  async findById(id: string): Promise<AccountReceivable | null> {
    const entity = await this.arRepository.findOne({ where: { id } });
    if (!entity) return null;
    return AccountReceivableMapper.toDomain(entity);
  }

  async setLinkedCxp(id: string, linkedCxpId: string): Promise<void> {
    await this.arRepository.update(id, { linkedCxpId });
  }

  async create(
    data: Omit<AccountReceivable, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AccountReceivable> {
    const entity = new AccountReceivableEntity();
    entity.userId = data.userId;
    entity.name = data.name;
    entity.description = data.description as string;
    entity.debtor = data.debtor as string;
    entity.originalAmount = data.originalAmount;
    entity.currentBalance = data.originalAmount; // currentBalance = originalAmount on creation
    entity.dueDate = data.dueDate as Date;
    entity.status = 'pending';
    entity.nulledAt = null;

    const saved = await this.arRepository.save(entity);
    return AccountReceivableMapper.toDomain(saved);
  }

  async update(id: string, data: Partial<AccountReceivable>): Promise<AccountReceivable | null> {
    const updateData: Partial<AccountReceivableEntity> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description as string;
    if (data.debtor !== undefined) updateData.debtor = data.debtor as string;
    if (data.originalAmount !== undefined) updateData.originalAmount = data.originalAmount;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate as Date;
    if (data.status !== undefined) updateData.status = data.status;

    const result = await this.arRepository.update(id, updateData);
    if (result.affected === 0) return null;

    const updated = await this.arRepository.findOne({ where: { id } });
    if (!updated) return null;
    return AccountReceivableMapper.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.arRepository.update(id, { nulledAt: new Date() });
  }

  async registerCollection(
    accountReceivableId: string,
    amount: number,
    collectionDate: Date,
    notes?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create collection record
      const collection = new AccountReceivableCollectionEntity();
      collection.accountReceivableId = accountReceivableId;
      collection.amount = amount;
      collection.collectionDate = collectionDate;
      collection.notes = notes as string;
      await queryRunner.manager.save(AccountReceivableCollectionEntity, collection);

      // 2. Get current account receivable
      const ar = await queryRunner.manager.findOne(AccountReceivableEntity, {
        where: { id: accountReceivableId },
      });

      if (!ar) {
        await queryRunner.rollbackTransaction();
        return;
      }

      // 3. Decrement currentBalance
      let newBalance = Number(ar.currentBalance) - Number(amount);
      let newStatus: 'pending' | 'partial' | 'collected' | 'overdue' = ar.status;

      if (newBalance <= 0) {
        // 4a. Fully collected
        newBalance = 0;
        newStatus = 'collected';
      } else if (newBalance < Number(ar.originalAmount)) {
        // 4b. Partially collected
        newStatus = 'partial';
      }

      await queryRunner.manager.update(AccountReceivableEntity, accountReceivableId, {
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

  async getSummaryData(userId: string): Promise<AccountReceivableSummaryData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // totalReceivable: SUM(currentBalance) WHERE nulledAt IS NULL AND status IN ('pending','partial')
    const totalReceivableResult = await this.arRepository
      .createQueryBuilder('ar')
      .select('COALESCE(SUM(ar.current_balance), 0)', 'total')
      .where('ar.user_id = :userId', { userId })
      .andWhere('ar.nulled_at IS NULL')
      .andWhere('ar.status IN (:...statuses)', { statuses: ['pending', 'partial'] })
      .getRawOne<{ total: string }>();

    // overdueCount: COUNT WHERE dueDate < TODAY AND status IN ('pending','partial') AND nulledAt IS NULL
    const overdueCountResult = await this.arRepository
      .createQueryBuilder('ar')
      .select('COUNT(ar.id)', 'count')
      .where('ar.user_id = :userId', { userId })
      .andWhere('ar.nulled_at IS NULL')
      .andWhere('ar.status IN (:...statuses)', { statuses: ['pending', 'partial'] })
      .andWhere('ar.due_date < :today', { today: now.toISOString().split('T')[0] })
      .getRawOne<{ count: string }>();

    // expectedThisMonth: SUM currentBalance WHERE dueDate in current month AND status active
    const expectedThisMonthResult = await this.arRepository
      .createQueryBuilder('ar')
      .select('COALESCE(SUM(ar.current_balance), 0)', 'total')
      .where('ar.user_id = :userId', { userId })
      .andWhere('ar.nulled_at IS NULL')
      .andWhere('ar.status IN (:...statuses)', { statuses: ['pending', 'partial'] })
      .andWhere('ar.due_date BETWEEN :start AND :end', {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0],
      })
      .getRawOne<{ total: string }>();

    // nextDueDate: MIN(dueDate) future with active status
    const nextDueDateResult = await this.arRepository
      .createQueryBuilder('ar')
      .select('MIN(ar.due_date)', 'nextDue')
      .where('ar.user_id = :userId', { userId })
      .andWhere('ar.nulled_at IS NULL')
      .andWhere('ar.status IN (:...statuses)', { statuses: ['pending', 'partial'] })
      .andWhere('ar.due_date >= :today', { today: now.toISOString().split('T')[0] })
      .getRawOne<{ nextDue: string | null }>();

    // collectedThisMonth: SUM of collections in current month
    const collectedThisMonthResult = await this.collectionRepository
      .createQueryBuilder('col')
      .innerJoin('col.accountReceivable', 'ar')
      .select('COALESCE(SUM(col.amount), 0)', 'total')
      .where('ar.user_id = :userId', { userId })
      .andWhere('col.collection_date BETWEEN :start AND :end', {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0],
      })
      .getRawOne<{ total: string }>();

    // byStatus counts
    const byStatusResult = await this.arRepository
      .createQueryBuilder('ar')
      .select('ar.status', 'status')
      .addSelect('COALESCE(SUM(ar.current_balance), 0)', 'total')
      .where('ar.user_id = :userId', { userId })
      .andWhere('ar.nulled_at IS NULL')
      .andWhere('ar.status IN (:...statuses)', { statuses: ['pending', 'partial', 'overdue'] })
      .groupBy('ar.status')
      .getRawMany<{ status: string; total: string }>();

    const byStatus = { pending: 0, partial: 0, overdue: 0 };
    for (const row of byStatusResult) {
      if (row.status === 'pending') byStatus.pending = Number(row.total);
      else if (row.status === 'partial') byStatus.partial = Number(row.total);
      else if (row.status === 'overdue') byStatus.overdue = Number(row.total);
    }

    return {
      totalReceivable: Number(totalReceivableResult?.total ?? 0),
      overdueCount: Number(overdueCountResult?.count ?? 0),
      expectedThisMonth: Number(expectedThisMonthResult?.total ?? 0),
      nextDueDate: nextDueDateResult?.nextDue ? new Date(nextDueDateResult.nextDue) : null,
      collectedThisMonth: Number(collectedThisMonthResult?.total ?? 0),
      byStatus,
    };
  }
}
