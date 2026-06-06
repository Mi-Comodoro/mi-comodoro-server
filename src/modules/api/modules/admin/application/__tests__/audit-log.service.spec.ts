import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { AuditLogEntity } from '../../infrastructure/database/entities/audit-log.entity';
import { AuditLogService } from '../audit-log.service';

const mockQb = {
  orderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
};

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeEntry = (overrides = {}) => ({
  id: 'log-1',
  adminId: 'admin-1',
  action: 'USER_UPDATED',
  createdAt: new Date(),
  ...overrides,
});

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLogEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.orderBy.mockReturnThis();
    mockQb.andWhere.mockReturnThis();
    mockQb.skip.mockReturnThis();
    mockQb.take.mockReturnThis();
  });

  // ─── log ───────────────────────────────────────────────────────────────────
  describe('log', () => {
    it('creates and saves an audit log entry', async () => {
      const entity = makeEntry();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const dto = {
        adminId: 'admin-1',
        adminHandle: 'admin@test.com',
        action: 'USER_ROLE_CHANGED' as const,
      };
      await service.log(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ adminId: 'admin-1', action: 'USER_ROLE_CHANGED' }),
      );
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('swallows errors without throwing', async () => {
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.log({ adminId: 'admin-1', adminHandle: 'admin@test.com', action: 'USER_DELETED' }),
      ).resolves.not.toThrow();
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns paginated results with defaults', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[makeEntry()], 1]);

      const result = await service.findAll({});

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies action filter when provided', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ action: 'USER_UPDATED' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'al.action = :action',
        expect.objectContaining({ action: 'USER_UPDATED' }),
      );
    });

    it('applies targetType filter when provided', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ targetType: 'user' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'al.targetType = :targetType',
        expect.objectContaining({ targetType: 'user' }),
      );
    });

    it('applies from/to date filters when provided', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ from: '2024-01-01', to: '2024-12-31' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('al.createdAt >= :from', expect.anything());
      expect(mockQb.andWhere).toHaveBeenCalledWith('al.createdAt <= :to', expect.anything());
    });

    it('caps limit at 100', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({ limit: 500 });

      expect(result.limit).toBe(100);
    });
  });
});
