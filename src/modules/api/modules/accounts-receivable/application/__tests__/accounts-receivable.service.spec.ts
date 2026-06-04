import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { AccountsReceivableService } from '../accounts-receivable.service';

const mockRepo = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  registerCollection: jest.fn(),
  setLinkedCxp: jest.fn(),
  getSummaryData: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeAr = (overrides = {}) => ({
  id: 'ar-1',
  userId: 'user-1',
  name: 'Préstamo a Juan',
  debtor: 'Juan',
  originalAmount: 500000,
  currentBalance: 500000,
  status: 'pending',
  ...overrides,
});

describe('AccountsReceivableService', () => {
  let service: AccountsReceivableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsReceivableService,
        { provide: 'AccountReceivableRepository', useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AccountsReceivableService>(AccountsReceivableService);
    jest.clearAllMocks();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns all accounts receivable for user', async () => {
      mockRepo.findAll.mockResolvedValue([makeAr()]);
      const result = await service.findAll('user-1');
      expect(mockRepo.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('ar-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns account when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeAr());
      const result = await service.findOne('ar-1', 'user-1');
      expect(result.id).toBe('ar-1');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { name: 'Deuda María', debtor: 'María', originalAmount: 200000 };

    it('sets currentBalance equal to originalAmount', async () => {
      mockRepo.create.mockImplementation((data: Record<string, unknown>) => Promise.resolve(data));
      await service.create('user-1', dto as never);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ currentBalance: 200000, status: 'pending' }),
      );
    });

    it('returns the created account', async () => {
      mockRepo.create.mockResolvedValue(makeAr({ name: 'Deuda María' }));
      const result = await service.create('user-1', dto as never);
      expect(result.name).toBe('Deuda María');
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('throws NotFoundException when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update('ar-1', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when update returns null', async () => {
      mockRepo.findOne.mockResolvedValue(makeAr());
      mockRepo.update.mockResolvedValue(null);
      await expect(service.update('ar-1', 'user-1', { name: 'Nuevo' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns updated account', async () => {
      mockRepo.findOne.mockResolvedValue(makeAr());
      mockRepo.update.mockResolvedValue(makeAr({ name: 'Actualizado' }));
      const result = await service.update('ar-1', 'user-1', { name: 'Actualizado' });
      expect(result.name).toBe('Actualizado');
    });
  });

  // ─── softDelete ────────────────────────────────────────────────────────────
  describe('softDelete', () => {
    it('throws NotFoundException when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.softDelete('ar-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('soft deletes the account', async () => {
      mockRepo.findOne.mockResolvedValue(makeAr());
      mockRepo.softDelete.mockResolvedValue(undefined);
      await service.softDelete('ar-1', 'user-1');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('ar-1');
    });
  });

  // ─── registerCollection ────────────────────────────────────────────────────
  describe('registerCollection', () => {
    const dto = { amount: 100000, collectionDate: '2024-06-15', notes: 'Cuota' };

    it('throws NotFoundException when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.registerCollection('ar-1', 'user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('registers the collection', async () => {
      mockRepo.findOne.mockResolvedValue(makeAr());
      mockRepo.registerCollection.mockResolvedValue(undefined);
      await service.registerCollection('ar-1', 'user-1', dto);
      expect(mockRepo.registerCollection).toHaveBeenCalledWith(
        'ar-1',
        100000,
        new Date('2024-06-15'),
        'Cuota',
      );
    });
  });

  // ─── autoCollect ───────────────────────────────────────────────────────────
  describe('autoCollect', () => {
    it('delegates directly to repository without ownership check', async () => {
      mockRepo.registerCollection.mockResolvedValue(undefined);
      const date = new Date('2024-06-15');
      await service.autoCollect('ar-1', 50000, date, 'Auto');
      expect(mockRepo.registerCollection).toHaveBeenCalledWith('ar-1', 50000, date, 'Auto');
    });
  });

  // ─── findByIdInternal ──────────────────────────────────────────────────────
  describe('findByIdInternal', () => {
    it('returns null when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      const result = await service.findByIdInternal('ar-1');
      expect(result).toBeNull();
    });

    it('returns account when found', async () => {
      mockRepo.findById.mockResolvedValue(makeAr());
      const result = await service.findByIdInternal('ar-1');
      expect(result?.id).toBe('ar-1');
    });
  });

  // ─── setLinkedCxp ──────────────────────────────────────────────────────────
  describe('setLinkedCxp', () => {
    it('delegates to repository', async () => {
      mockRepo.setLinkedCxp.mockResolvedValue(undefined);
      await service.setLinkedCxp('ar-1', 'ap-1');
      expect(mockRepo.setLinkedCxp).toHaveBeenCalledWith('ar-1', 'ap-1');
    });
  });

  // ─── getSummary ────────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('delegates to repository', async () => {
      const summary = { totalReceivable: 500000 };
      mockRepo.getSummaryData.mockResolvedValue(summary);
      const result = await service.getSummary('user-1');
      expect(result).toEqual(summary);
    });
  });
});
