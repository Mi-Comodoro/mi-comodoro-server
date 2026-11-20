import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { SystemConfigEntity } from '../system-config.entity';
import { SystemConfigService } from '../system-config.service';

const mockRepo = { find: jest.fn(), findOne: jest.fn(), upsert: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('SystemConfigService', () => {
  let service: SystemConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: getRepositoryToken(SystemConfigEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
    jest.clearAllMocks();
    // Clear the internal cache between tests
    (service as unknown as Record<string, unknown>).cache = new Map();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns all config entries ordered by key', async () => {
      mockRepo.find.mockResolvedValue([{ key: 'a' }, { key: 'b' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith({ order: { key: 'ASC' } });
    });
  });

  // ─── get ──────────────────────────────────────────────────────────────────
  describe('get', () => {
    it('returns value from DB when not cached', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'refresh_days', value: '14' });
      const result = await service.get('refresh_days');
      expect(result).toBe('14');
    });

    it('returns defaultValue when key not found in DB', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.get('unknown_key', 'fallback');
      expect(result).toBe('fallback');
    });

    it('returns empty string when key not found and no default', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.get('missing_key');
      expect(result).toBe('');
    });

    it('returns cached value without hitting DB on second call', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'my_key', value: 'cached' });
      await service.get('my_key');
      await service.get('my_key');
      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getNumber ────────────────────────────────────────────────────────────
  describe('getNumber', () => {
    it('parses string value as number', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'timeout', value: '30' });
      const result = await service.getNumber('timeout', 10);
      expect(result).toBe(30);
    });

    it('returns defaultValue when value is not a valid number', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'bad_key', value: 'not_a_number' });
      const result = await service.getNumber('bad_key', 7);
      expect(result).toBe(7);
    });

    it('returns defaultValue when key not found in DB', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getNumber('missing', 5);
      expect(result).toBe(5);
    });
  });

  // ─── getBoolean ───────────────────────────────────────────────────────────
  describe('getBoolean', () => {
    it("returns true when value is 'true'", async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'feature_flag', value: 'true' });
      const result = await service.getBoolean('feature_flag', false);
      expect(result).toBe(true);
    });

    it("returns false when value is 'false'", async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'feature_flag', value: 'false' });
      const result = await service.getBoolean('feature_flag', true);
      expect(result).toBe(false);
    });

    it('returns false when key not found and default is false', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getBoolean('missing', false);
      expect(result).toBe(false);
    });
  });

  // ─── set ──────────────────────────────────────────────────────────────────
  describe('set', () => {
    it('upserts config value and invalidates cache', async () => {
      // Pre-populate cache
      mockRepo.findOne.mockResolvedValue({ key: 'my_key', value: 'old' });
      await service.get('my_key');
      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);

      // Update value
      mockRepo.upsert.mockResolvedValue(undefined);
      mockRepo.findOne.mockResolvedValue({ key: 'my_key', value: 'new' });
      await service.set('my_key', 'new', 'admin-1');

      // Cache should be cleared — next get hits DB again
      await service.get('my_key');
      expect(mockRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it('calls upsert with correct parameters', async () => {
      mockRepo.upsert.mockResolvedValue(undefined);
      await service.set('key1', 'value1', 'admin-1');
      expect(mockRepo.upsert).toHaveBeenCalledWith(
        { key: 'key1', value: 'value1', updatedBy: 'admin-1' },
        ['key'],
      );
    });

    it('logs info when setting a config value', async () => {
      mockRepo.upsert.mockResolvedValue(undefined);
      await service.set('key1', 'value1', 'admin-1');
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});
