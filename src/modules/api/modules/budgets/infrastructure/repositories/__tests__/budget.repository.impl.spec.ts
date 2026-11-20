import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { BudgetEntity } from '../../database/entities/budget.entity';
import { BudgetRepositoryImpl } from '../budget.repository.impl';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeBudgetEntity = (overrides = {}) => ({
  id: 'budget-1',
  financesId: 'finance-1',
  ownerId: 'user-1',
  month: 'enero',
  year: 2026,
  status: 'ACTIVE',
  isDefault: true,
  nulledAt: null,
  closedAt: null,
  name: 'Presupuesto Enero',
  strategy: '50-30-20',
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('BudgetRepositoryImpl', () => {
  let repository: BudgetRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetRepositoryImpl,
        { provide: getRepositoryToken(BudgetEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<BudgetRepositoryImpl>(BudgetRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('creates entity, saves and returns budget', async () => {
      const entity = makeBudgetEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      const result = await repository.save({ financesId: 'finance-1', month: 'enero', year: 2026 });
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'budget-1' });
    });
  });

  describe('findByFinancesIdAndMonth', () => {
    it('returns budget when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeBudgetEntity());
      const result = await repository.findByFinancesIdAndMonth('finance-1', 'enero', 2026);
      expect(result).toMatchObject({ month: 'enero' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByFinancesIdAndMonth('finance-1', 'marzo', 2026);
      expect(result).toBeNull();
    });
  });

  describe('findPreviousByFinancesId', () => {
    it('returns the most recent previous budget', async () => {
      mockRepo.find.mockResolvedValue([
        makeBudgetEntity({ month: 'noviembre', year: 2025 }),
        makeBudgetEntity({ id: 'budget-2', month: 'diciembre', year: 2025 }),
      ]);
      const result = await repository.findPreviousByFinancesId('finance-1', 'enero', 2026);
      expect(result).toMatchObject({ month: 'diciembre', year: 2025 });
    });

    it('returns null when no previous budget exists', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findPreviousByFinancesId('finance-1', 'enero', 2026);
      expect(result).toBeNull();
    });
  });

  describe('findAllByFinancesId', () => {
    it('returns all budgets for finances', async () => {
      mockRepo.find.mockResolvedValue([makeBudgetEntity(), makeBudgetEntity({ id: 'budget-2' })]);
      const result = await repository.findAllByFinancesId('finance-1');
      expect(result).toHaveLength(2);
    });

    it('filters by year when provided', async () => {
      mockRepo.find.mockResolvedValue([makeBudgetEntity()]);
      await repository.findAllByFinancesId('finance-1', 2026);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { financesId: 'finance-1', year: 2026 },
      });
    });
  });

  describe('findHistoricalSummaryByFinancesId', () => {
    it('returns mapped historical summary from raw query', async () => {
      mockRepo.query.mockResolvedValue([
        {
          month: 'enero',
          year: '2026',
          status: 'CLOSED',
          expectedIncome: '15000',
          receivedIncome: '15000',
          totalExpenses: '8000',
          totalSavings: '3000',
        },
      ]);
      const result = await repository.findHistoricalSummaryByFinancesId('finance-1', 2026);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        month: 'enero',
        year: 2026,
        expectedIncome: 15000,
      });
    });
  });

  describe('findById', () => {
    it('returns budget when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeBudgetEntity());
      const result = await repository.findById('budget-1');
      expect(result).toMatchObject({ id: 'budget-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('active', () => {
    it('sets status to ACTIVE and returns updated budget', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(makeBudgetEntity({ status: 'ACTIVE' }));
      const result = await repository.active('budget-1');
      expect(result).toMatchObject({ status: 'ACTIVE' });
    });

    it('throws NotFoundException when budget not found', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });
      await expect(repository.active('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('close', () => {
    it('sets status to CLOSED and returns updated budget', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(makeBudgetEntity({ status: 'CLOSED' }));
      const result = await repository.close('budget-1');
      expect(result).toMatchObject({ status: 'CLOSED' });
    });

    it('throws NotFoundException when budget not found', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });
      await expect(repository.close('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActiveExpired', () => {
    it('returns expired active budgets via raw query', async () => {
      mockRepo.query.mockResolvedValue([
        makeBudgetEntity({ status: 'ACTIVE', month: 'mayo', year: 2025 }),
      ]);
      const result = await repository.findActiveExpired(2026, 1);
      expect(result).toHaveLength(1);
    });
  });

  describe('findClosedByFinancesId', () => {
    it('returns closed budgets for finances', async () => {
      mockRepo.find.mockResolvedValue([makeBudgetEntity({ status: 'CLOSED' })]);
      const result = await repository.findClosedByFinancesId('finance-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('returns null when no rows affected', async () => {
      mockRepo.update.mockResolvedValue({ affected: 0 });
      const result = await repository.update('unknown', { name: 'Nuevo' });
      expect(result).toBeNull();
    });

    it('updates budget and returns refreshed entity', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(makeBudgetEntity({ name: 'Actualizado' }));
      const result = await repository.update('budget-1', { name: 'Actualizado' });
      expect(result).toMatchObject({ id: 'budget-1' });
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark budget as deleted', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('budget-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'budget-1' },
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });

  describe('findDefaultActiveByOwnerId', () => {
    it('returns default active budget for owner', async () => {
      mockRepo.findOne.mockResolvedValue(makeBudgetEntity());
      const result = await repository.findDefaultActiveByOwnerId('user-1');
      expect(result).toMatchObject({ isDefault: true });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findDefaultActiveByOwnerId('user-1');
      expect(result).toBeNull();
    });
  });

  describe('setDefault', () => {
    it('unsets previous default, sets new default and returns updated budget', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findOne.mockResolvedValue(makeBudgetEntity({ isDefault: true }));
      const result = await repository.setDefault('budget-1', 'user-1');
      expect(mockRepo.update).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({ id: 'budget-1' });
    });

    it('throws NotFoundException when budget not found after update', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findOne.mockResolvedValue(null);
      await expect(repository.setDefault('unknown', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
