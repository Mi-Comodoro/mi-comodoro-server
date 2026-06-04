import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountPayableEntity } from '../../database/account-payable.entity';
import { AccountPayablePaymentEntity } from '../../database/account-payable-payment.entity';
import { AccountPayableRepositoryImpl } from '../account-payable.repository.impl';

const mockUpdateQb = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  whereInIds: jest.fn().mockReturnThis(),
  execute: jest.fn(),
};

const mockAccountPayableRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockUpdateQb),
};

const mockPaymentRepo = {};

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
  query: jest.fn(),
};

const makeEntity = (overrides = {}) => ({
  id: 'cxp-1',
  userId: 'user-1',
  name: 'Tarjeta Crédito',
  description: null,
  type: 'credit_card',
  originalAmount: '10000',
  currentBalance: '8000',
  minimumPayment: '500',
  interestRate: '0.18',
  dueDate: new Date('2026-12-31'),
  nextPaymentDate: new Date('2026-07-01'),
  status: 'active',
  linkedCxcId: null,
  nulledAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('AccountPayableRepositoryImpl', () => {
  let repository: AccountPayableRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountPayableRepositoryImpl,
        { provide: getRepositoryToken(AccountPayableEntity), useValue: mockAccountPayableRepo },
        { provide: getRepositoryToken(AccountPayablePaymentEntity), useValue: mockPaymentRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repository = module.get<AccountPayableRepositoryImpl>(AccountPayableRepositoryImpl);
    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    mockAccountPayableRepo.createQueryBuilder.mockReturnValue(mockUpdateQb);
  });

  describe('findAll', () => {
    it('returns all active accounts payable for user', async () => {
      mockAccountPayableRepo.find.mockResolvedValue([makeEntity(), makeEntity({ id: 'cxp-2' })]);
      const result = await repository.findAll('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns account when found', async () => {
      mockAccountPayableRepo.findOne.mockResolvedValue(makeEntity());
      const result = await repository.findOne('cxp-1', 'user-1');
      expect(result).toMatchObject({ id: 'cxp-1' });
    });

    it('returns null when not found', async () => {
      mockAccountPayableRepo.findOne.mockResolvedValue(null);
      const result = await repository.findOne('unknown', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns account when found', async () => {
      mockAccountPayableRepo.findOne.mockResolvedValue(makeEntity());
      const result = await repository.findById('cxp-1');
      expect(result).toMatchObject({ id: 'cxp-1' });
    });

    it('returns null when not found', async () => {
      mockAccountPayableRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('setLinkedCxc', () => {
    it('updates linkedCxcId', async () => {
      mockAccountPayableRepo.update.mockResolvedValue(undefined);
      await repository.setLinkedCxc('cxp-1', 'cxr-1');
      expect(mockAccountPayableRepo.update).toHaveBeenCalledWith('cxp-1', { linkedCxcId: 'cxr-1' });
    });
  });

  describe('create', () => {
    it('maps to entity, saves and returns domain object', async () => {
      mockAccountPayableRepo.save.mockResolvedValue(makeEntity());
      const result = await repository.create({
        userId: 'user-1',
        name: 'Tarjeta Crédito',
        type: 'credit_card',
        originalAmount: 10000,
        status: 'active',
      } as never);
      expect(result).toMatchObject({ id: 'cxp-1' });
    });
  });

  describe('update', () => {
    it('returns null when no rows affected', async () => {
      mockAccountPayableRepo.update.mockResolvedValue({ affected: 0 });
      const result = await repository.update('unknown', { name: 'Nuevo' });
      expect(result).toBeNull();
    });

    it('updates and returns updated entity', async () => {
      mockAccountPayableRepo.update.mockResolvedValue({ affected: 1 });
      mockAccountPayableRepo.findOne.mockResolvedValue(makeEntity({ name: 'Actualizado' }));
      const result = await repository.update('cxp-1', { name: 'Actualizado' });
      expect(result).toMatchObject({ id: 'cxp-1' });
    });

    it('returns null when entity not found after update', async () => {
      mockAccountPayableRepo.update.mockResolvedValue({ affected: 1 });
      mockAccountPayableRepo.findOne.mockResolvedValue(null);
      const result = await repository.update('cxp-1', { name: 'Actualizado' });
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark account as deleted', async () => {
      mockAccountPayableRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('cxp-1');
      expect(mockAccountPayableRepo.update).toHaveBeenCalledWith(
        'cxp-1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });

  describe('registerPayment', () => {
    it('saves payment, updates balance and commits transaction', async () => {
      const entity = makeEntity({ currentBalance: '8000' });
      mockManager.save.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(entity);
      mockManager.update.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      await repository.registerPayment('cxp-1', 1000, new Date('2026-06-01'));

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockManager.update).toHaveBeenCalledWith(
        AccountPayableEntity,
        'cxp-1',
        expect.objectContaining({ currentBalance: 7000, status: 'active' }),
      );
    });

    it('marks account as paid when balance reaches zero', async () => {
      const entity = makeEntity({ currentBalance: '500' });
      mockManager.save.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(entity);
      mockManager.update.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      await repository.registerPayment('cxp-1', 500, new Date('2026-06-01'));

      expect(mockManager.update).toHaveBeenCalledWith(
        AccountPayableEntity,
        'cxp-1',
        expect.objectContaining({ currentBalance: 0, status: 'paid' }),
      );
    });

    it('throws NotFoundException and rolls back when account not found', async () => {
      mockManager.save.mockResolvedValue(undefined);
      mockManager.findOne.mockResolvedValue(null);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      await expect(
        repository.registerPayment('unknown', 500, new Date('2026-06-01')),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
