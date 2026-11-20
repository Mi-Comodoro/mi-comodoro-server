import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { AccountService } from '../account.service';

const mockAccountRepo = {
  add: jest.fn(),
  get: jest.fn(),
  findByIdAndUser: jest.fn(),
  update: jest.fn(),
};
const mockRateHistoryRepo = {
  save: jest.fn(),
  findByAccount: jest.fn(),
};
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeAccount = (overrides = {}) => ({
  id: 'acc-1',
  name: 'Bancolombia',
  userId: 'user-1',
  interestRate: 5.5,
  compoundingFrequency: 'monthly' as const,
  isActive: true,
  isPrimary: false,
  ...overrides,
});

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: 'AccountRateHistoryRepository', useValue: mockRateHistoryRepo },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    jest.clearAllMocks();
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('saves and returns a new account', async () => {
      const account = makeAccount();
      mockAccountRepo.add.mockResolvedValue(account);

      const result = await service.create(account as never);
      expect(mockAccountRepo.add).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Bancolombia');
    });
  });

  // ─── get ───────────────────────────────────────────────────────────────────
  describe('get', () => {
    it('returns all accounts for a user', async () => {
      mockAccountRepo.get.mockResolvedValue([makeAccount()]);

      const result = await service.get('user-1');
      expect(mockAccountRepo.get).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('throws NotFoundException when account does not exist', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(service.update('acc-1', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('records rate history when interestRate changes', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(makeAccount({ interestRate: 5.5 }));
      mockAccountRepo.update.mockResolvedValue(makeAccount({ interestRate: 7.0 }));
      mockRateHistoryRepo.save.mockResolvedValue({});

      await service.update('acc-1', 'user-1', { interestRate: 7.0 });

      expect(mockRateHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ previousRate: 5.5, newRate: 7.0 }),
      );
    });

    it('does not record history when interestRate stays the same', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(makeAccount({ interestRate: 5.5 }));
      mockAccountRepo.update.mockResolvedValue(makeAccount());

      await service.update('acc-1', 'user-1', { interestRate: 5.5 });
      expect(mockRateHistoryRepo.save).not.toHaveBeenCalled();
    });

    it('does not record history when interestRate is not in update payload', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(makeAccount());
      mockAccountRepo.update.mockResolvedValue(makeAccount({ name: 'Nuevo' }));

      await service.update('acc-1', 'user-1', { name: 'Nuevo' });
      expect(mockRateHistoryRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when repository update returns null', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(makeAccount());
      mockAccountRepo.update.mockResolvedValue(null);

      await expect(service.update('acc-1', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('returns the updated account', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(makeAccount());
      mockAccountRepo.update.mockResolvedValue(makeAccount({ name: 'Davivienda' }));

      const result = await service.update('acc-1', 'user-1', { name: 'Davivienda' });
      expect(result.name).toBe('Davivienda');
    });
  });

  // ─── getRateHistory ────────────────────────────────────────────────────────
  describe('getRateHistory', () => {
    it('throws NotFoundException when account does not exist', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(service.getRateHistory('acc-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns rate history for an existing account', async () => {
      mockAccountRepo.findByIdAndUser.mockResolvedValue(makeAccount());
      mockRateHistoryRepo.findByAccount.mockResolvedValue([{ previousRate: 5, newRate: 7 }]);

      const result = await service.getRateHistory('acc-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(mockRateHistoryRepo.findByAccount).toHaveBeenCalledWith('acc-1');
    });
  });
});
