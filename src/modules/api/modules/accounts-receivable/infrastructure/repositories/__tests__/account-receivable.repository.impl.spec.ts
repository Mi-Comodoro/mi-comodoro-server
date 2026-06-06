import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountReceivableEntity } from '../../database/account-receivable.entity';
import { AccountReceivableCollectionEntity } from '../../database/account-receivable-collection.entity';
import { AccountReceivableRepositoryImpl } from '../account-receivable.repository.impl';

const mockQbChain = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
  getRawMany: jest.fn(),
};

const mockArRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQbChain),
};

const mockCollectionRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQbChain),
};

const mockManager = {
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: mockManager,
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const makeEntity = (overrides = {}) => ({
  id: 'cxr-1',
  userId: 'user-1',
  name: 'Préstamo a Pedro',
  description: null,
  debtor: 'Pedro Sánchez',
  originalAmount: '5000',
  currentBalance: '3000',
  dueDate: new Date('2026-12-31'),
  status: 'pending',
  linkedCxpId: null,
  nulledAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('AccountReceivableRepositoryImpl', () => {
  let repository: AccountReceivableRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountReceivableRepositoryImpl,
        { provide: getRepositoryToken(AccountReceivableEntity), useValue: mockArRepo },
        {
          provide: getRepositoryToken(AccountReceivableCollectionEntity),
          useValue: mockCollectionRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repository = module.get<AccountReceivableRepositoryImpl>(AccountReceivableRepositoryImpl);
    jest.clearAllMocks();
    mockArRepo.createQueryBuilder.mockReturnValue(mockQbChain);
    mockCollectionRepo.createQueryBuilder.mockReturnValue(mockQbChain);
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  describe('findAll', () => {
    it('returns all non-deleted accounts receivable for user', async () => {
      mockArRepo.find.mockResolvedValue([makeEntity(), makeEntity({ id: 'cxr-2' })]);
      const result = await repository.findAll('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns account when found', async () => {
      mockArRepo.findOne.mockResolvedValue(makeEntity());
      const result = await repository.findOne('cxr-1', 'user-1');
      expect(result).toMatchObject({ id: 'cxr-1' });
    });

    it('returns null when not found', async () => {
      mockArRepo.findOne.mockResolvedValue(null);
      const result = await repository.findOne('unknown', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns account when found', async () => {
      mockArRepo.findOne.mockResolvedValue(makeEntity());
      const result = await repository.findById('cxr-1');
      expect(result).toMatchObject({ id: 'cxr-1' });
    });

    it('returns null when not found', async () => {
      mockArRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('setLinkedCxp', () => {
    it('updates linkedCxpId', async () => {
      mockArRepo.update.mockResolvedValue(undefined);
      await repository.setLinkedCxp('cxr-1', 'cxp-1');
      expect(mockArRepo.update).toHaveBeenCalledWith('cxr-1', { linkedCxpId: 'cxp-1' });
    });
  });

  describe('create', () => {
    it('creates entity with currentBalance = originalAmount and saves', async () => {
      mockArRepo.save.mockResolvedValue(makeEntity());
      const result = await repository.create({
        userId: 'user-1',
        name: 'Préstamo a Pedro',
        debtor: 'Pedro Sánchez',
        originalAmount: 5000,
        status: 'pending',
        nulledAt: null,
      } as never);
      expect(result).toMatchObject({ id: 'cxr-1' });
    });
  });

  describe('update', () => {
    it('returns null when no rows affected', async () => {
      mockArRepo.update.mockResolvedValue({ affected: 0 });
      const result = await repository.update('unknown', { name: 'Nuevo' });
      expect(result).toBeNull();
    });

    it('updates and returns updated entity', async () => {
      mockArRepo.update.mockResolvedValue({ affected: 1 });
      mockArRepo.findOne.mockResolvedValue(makeEntity({ name: 'Actualizado' }));
      const result = await repository.update('cxr-1', { name: 'Actualizado' });
      expect(result).toMatchObject({ id: 'cxr-1' });
    });

    it('returns null when entity not found after update', async () => {
      mockArRepo.update.mockResolvedValue({ affected: 1 });
      mockArRepo.findOne.mockResolvedValue(null);
      const result = await repository.update('cxr-1', { name: 'Actualizado' });
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark account as deleted', async () => {
      mockArRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('cxr-1');
      expect(mockArRepo.update).toHaveBeenCalledWith(
        'cxr-1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });

  describe('registerCollection', () => {
    it('saves collection, decrements balance and commits', async () => {
      const entity = makeEntity({ currentBalance: '3000' });
      mockManager.save.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(entity);
      mockManager.update.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      await repository.registerCollection('cxr-1', 1000, new Date('2026-06-01'));

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockManager.update).toHaveBeenCalledWith(
        AccountReceivableEntity,
        'cxr-1',
        expect.objectContaining({ currentBalance: 2000, status: 'partial' }),
      );
    });

    it('marks as collected when balance reaches zero', async () => {
      const entity = makeEntity({ currentBalance: '500', originalAmount: '5000' });
      mockManager.save.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(entity);
      mockManager.update.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      await repository.registerCollection('cxr-1', 500, new Date('2026-06-01'));

      expect(mockManager.update).toHaveBeenCalledWith(
        AccountReceivableEntity,
        'cxr-1',
        expect.objectContaining({ currentBalance: 0, status: 'collected' }),
      );
    });

    it('rolls back and returns when account not found', async () => {
      mockManager.save.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(null);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      await repository.registerCollection('unknown', 500, new Date('2026-06-01'));

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getSummaryData', () => {
    it('returns aggregated summary with all zero values when no data', async () => {
      mockQbChain.getRawOne.mockResolvedValue(null);
      mockQbChain.getRawMany.mockResolvedValue([]);
      const result = await repository.getSummaryData('user-1');
      expect(result).toMatchObject({
        totalReceivable: 0,
        overdueCount: 0,
        expectedThisMonth: 0,
        nextDueDate: null,
        collectedThisMonth: 0,
        byStatus: { pending: 0, partial: 0, overdue: 0 },
      });
    });

    it('returns summary with computed values', async () => {
      mockQbChain.getRawOne
        .mockResolvedValueOnce({ total: '8000' })
        .mockResolvedValueOnce({ count: '2' })
        .mockResolvedValueOnce({ total: '3000' })
        .mockResolvedValueOnce({ nextDue: '2026-07-15' })
        .mockResolvedValueOnce({ total: '1000' });
      mockQbChain.getRawMany.mockResolvedValue([
        { status: 'pending', total: '5000' },
        { status: 'partial', total: '3000' },
      ]);
      const result = await repository.getSummaryData('user-1');
      expect(result.totalReceivable).toBe(8000);
      expect(result.overdueCount).toBe(2);
      expect(result.byStatus.pending).toBe(5000);
    });
  });
});
