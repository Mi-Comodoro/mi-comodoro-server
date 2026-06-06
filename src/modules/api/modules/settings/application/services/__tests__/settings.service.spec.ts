import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { SettingsService } from '../settings.service';

const mockRepo = {
  upsert: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeSettings = (overrides = {}) => ({
  id: 'settings-1',
  userId: 'user-1',
  currency: 'COP',
  language: 'es',
  ...overrides,
});

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'SettingsRepository', useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  // ─── getSettings ───────────────────────────────────────────────────────────
  describe('getSettings', () => {
    it('delegates to upsert and returns settings', async () => {
      mockRepo.upsert.mockResolvedValue(makeSettings());
      const result = await service.getSettings('user-1');
      expect(mockRepo.upsert).toHaveBeenCalledWith('user-1');
      expect(result.userId).toBe('user-1');
    });
  });

  // ─── updateSettings ────────────────────────────────────────────────────────
  describe('updateSettings', () => {
    it('throws NotFoundException when settings not found', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      await expect(service.updateSettings('user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('returns updated settings', async () => {
      mockRepo.findByUserId.mockResolvedValue(makeSettings());
      mockRepo.update.mockResolvedValue(makeSettings({ currency: 'USD' }));

      const result = await service.updateSettings('user-1', { currency: 'USD' } as never);

      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { currency: 'USD' });
      expect(result.currency).toBe('USD');
    });
  });

  // ─── updateBudgetDefaults ──────────────────────────────────────────────────
  describe('updateBudgetDefaults', () => {
    it('throws NotFoundException when settings not found', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      await expect(service.updateBudgetDefaults('user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('returns updated settings with budget defaults', async () => {
      mockRepo.findByUserId.mockResolvedValue(makeSettings());
      mockRepo.update.mockResolvedValue(makeSettings({ needsPercent: 50 }));

      const result = await service.updateBudgetDefaults('user-1', { needsPercent: 50 } as never);

      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { needsPercent: 50 });
      expect((result as unknown as Record<string, unknown>).needsPercent).toBe(50);
    });
  });
});
