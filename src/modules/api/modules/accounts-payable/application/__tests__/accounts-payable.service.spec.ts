import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { AccountsReceivableService } from '../../../accounts-receivable/application/accounts-receivable.service';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { AccountsPayableService } from '../accounts-payable.service';

const mockRepo = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  registerPayment: jest.fn(),
  setLinkedCxc: jest.fn(),
  getSummaryData: jest.fn(),
};
const mockArService = { findByIdInternal: jest.fn(), autoCollect: jest.fn() };
const mockNotificationsService = { createNotification: jest.fn() };
const mockDataSource = { query: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeAccount = (overrides = {}) => ({
  id: 'ap-1',
  userId: 'user-1',
  name: 'Tarjeta Visa',
  type: 'credit_card' as const,
  originalAmount: 5000000,
  currentBalance: 3000000,
  minimumPayment: 150000,
  status: 'active' as const,
  linkedCxcId: undefined,
  ...overrides,
});

describe('AccountsPayableService', () => {
  let service: AccountsPayableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsPayableService,
        { provide: 'AccountPayableRepository', useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: AccountsReceivableService, useValue: mockArService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AccountsPayableService>(AccountsPayableService);
    jest.clearAllMocks();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns all accounts for user', async () => {
      mockRepo.findAll.mockResolvedValue([makeAccount()]);
      const result = await service.findAll('user-1');
      expect(mockRepo.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('throws NotFoundException when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('ap-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns account when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccount());
      const result = await service.findOne('ap-1', 'user-1');
      expect(result.id).toBe('ap-1');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      name: 'Préstamo',
      type: 'loan' as const,
      originalAmount: 1000000,
      minimumPayment: 100000,
    };

    it('creates and returns the account', async () => {
      mockRepo.create.mockResolvedValue(makeAccount({ name: 'Préstamo' }));
      const result = await service.create('user-1', dto as never);
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Préstamo');
    });

    it('sets currentBalance equal to originalAmount on creation', async () => {
      mockRepo.create.mockImplementation((data: Record<string, unknown>) => Promise.resolve(data));
      await service.create('user-1', dto as never);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ currentBalance: dto.originalAmount }),
      );
    });

    it('sets status to active on creation', async () => {
      mockRepo.create.mockImplementation((data: Record<string, unknown>) => Promise.resolve(data));
      await service.create('user-1', dto as never);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('throws NotFoundException when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update('ap-1', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when repository update returns null', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccount());
      mockRepo.update.mockResolvedValue(null);
      await expect(service.update('ap-1', 'user-1', { name: 'Nuevo' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns updated account', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccount());
      mockRepo.update.mockResolvedValue(makeAccount({ name: 'Actualizado' }));

      const result = await service.update('ap-1', 'user-1', { name: 'Actualizado' });
      expect(result.name).toBe('Actualizado');
    });
  });

  // ─── softDelete ────────────────────────────────────────────────────────────
  describe('softDelete', () => {
    it('throws NotFoundException when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.softDelete('ap-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('soft deletes the account', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccount());
      mockRepo.softDelete.mockResolvedValue(undefined);

      await service.softDelete('ap-1', 'user-1');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('ap-1');
    });
  });

  // ─── registerPayment ──────────────────────────────────────────────────────
  describe('registerPayment', () => {
    const dto = { amount: 150000, paymentDate: '2024-06-15', notes: 'Cuota mensual' };

    it('throws NotFoundException when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.registerPayment('ap-1', 'user-1', dto as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('registers payment and returns success message', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccount());
      mockRepo.registerPayment.mockResolvedValue(undefined);

      const result = await service.registerPayment('ap-1', 'user-1', dto as never);
      expect(mockRepo.registerPayment).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('Payment registered successfully');
    });
  });

  // ─── getSummary ────────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('returns summary with correct calculations', async () => {
      mockRepo.getSummaryData.mockResolvedValue({
        accounts: [
          {
            currentBalance: '1000000',
            minimumPayment: '100000',
            type: 'loan',
            status: 'active',
            nextPaymentDate: new Date(Date.now() + 86400000),
          },
          {
            currentBalance: '500000',
            minimumPayment: null,
            type: 'credit_card',
            status: 'active',
            nextPaymentDate: null,
          },
        ],
        avgMonthlyIncome: 5000000,
      });

      const result = await service.getSummary('user-1');

      expect(result.totalDebt).toBe(1500000);
      expect(result.monthlyCommitments).toBe(100000);
      expect(result.overdueCount).toBe(0);
      expect(result.byType['loan']).toBe(1000000);
      expect(result.byType['credit_card']).toBe(500000);
    });

    it('sets debtToIncomeRatio to 2 when income is 0 but there is debt', async () => {
      mockRepo.getSummaryData.mockResolvedValue({
        accounts: [
          {
            currentBalance: '1000000',
            minimumPayment: null,
            type: 'loan',
            status: 'active',
            nextPaymentDate: null,
          },
        ],
        avgMonthlyIncome: 0,
      });

      const result = await service.getSummary('user-1');
      expect(result.debtToIncomeRatio).toBe(2);
    });

    it('sets debtToIncomeRatio to 0 when income is 0 and there is no debt', async () => {
      mockRepo.getSummaryData.mockResolvedValue({ accounts: [], avgMonthlyIncome: 0 });
      const result = await service.getSummary('user-1');
      expect(result.debtToIncomeRatio).toBe(0);
      expect(result.nextDueDate).toBeNull();
    });

    it('counts overdue accounts correctly', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      mockRepo.getSummaryData.mockResolvedValue({
        accounts: [
          {
            currentBalance: '100000',
            type: 'loan',
            status: 'active',
            nextPaymentDate: yesterday,
            minimumPayment: null,
          },
        ],
        avgMonthlyIncome: 0,
      });

      const result = await service.getSummary('user-1');
      expect(result.overdueCount).toBe(1);
    });
  });
});
