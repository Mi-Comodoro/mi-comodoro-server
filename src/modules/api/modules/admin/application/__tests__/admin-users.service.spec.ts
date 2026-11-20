import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';
import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';
import { UserProfileEntity } from '@/modules/api/modules/user-profile/infrastructure/database/entities/user-profile.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import { AdminUsersService } from '../admin-users.service';
import { AuditLogService } from '../audit-log.service';

const mockUserRepo = {
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockQb = {
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
};

const mockProfileRepo = { update: jest.fn() };
const mockBudgetRepo = { count: jest.fn() };
const mockTransactionRepo = { count: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
const mockAuditLogService = { log: jest.fn() };

const makeUserEntity = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@test.com',
  role: 'user',
  createdAt: new Date(),
  nulledAt: null,
  userProfile: { id: 'profile-1', displayName: 'Test User', name: 'Test', isActive: true },
  ...overrides,
});

describe('AdminUsersService', () => {
  let service: AdminUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserProfileEntity), useValue: mockProfileRepo },
        { provide: getRepositoryToken(BudgetEntity), useValue: mockBudgetRepo },
        { provide: getRepositoryToken(TransactionEntity), useValue: mockTransactionRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
    jest.clearAllMocks();
    mockUserRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.innerJoin.mockReturnThis();
    mockQb.where.mockReturnThis();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns paginated users with defaults', async () => {
      const user = makeUserEntity();
      mockUserRepo.findAndCount.mockResolvedValue([[user], 1]);

      const result = await service.findAll({});

      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.users[0].email).toBe('test@test.com');
    });

    it('uses displayName from userProfile when available', async () => {
      const user = makeUserEntity({
        userProfile: { id: 'p-1', displayName: 'Display', isActive: true },
      });
      mockUserRepo.findAndCount.mockResolvedValue([[user], 1]);

      const result = await service.findAll({});

      expect(result.users[0].displayName).toBe('Display');
    });

    it('falls back to name when displayName missing', async () => {
      const user = makeUserEntity({
        userProfile: { id: 'p-1', displayName: null, name: 'Name', isActive: true },
      });
      mockUserRepo.findAndCount.mockResolvedValue([[user], 1]);

      const result = await service.findAll({});

      expect(result.users[0].displayName).toBe('Name');
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns user when found', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUserEntity());
      const result = await service.findById('user-1');
      expect(result.id).toBe('user-1');
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('throws NotFoundException when user not found on first findOne', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('user-1', { role: 'admin' } as never, 'admin-1', 'admin@test.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates role and logs audit when role changes', async () => {
      const user = makeUserEntity();
      mockUserRepo.findOne
        .mockResolvedValueOnce(user) // initial fetch
        .mockResolvedValueOnce(user); // findById call at end
      mockUserRepo.update.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);

      await service.update('user-1', { role: 'admin' } as never, 'admin-1', 'admin@test.com');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { role: 'admin' });
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_ROLE_CHANGED' }),
      );
    });

    it('updates isActive and logs audit when isActive changes', async () => {
      const user = makeUserEntity();
      mockUserRepo.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(user);
      mockProfileRepo.update.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);

      await service.update('user-1', { isActive: false } as never, 'admin-1', 'admin@test.com');

      expect(mockProfileRepo.update).toHaveBeenCalledWith('profile-1', { isActive: false });
      expect(mockAuditLogService.log).toHaveBeenCalledTimes(1);
    });

    it('does not log audit when no fields changed', async () => {
      const user = makeUserEntity();
      mockUserRepo.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(user);

      await service.update('user-1', {}, 'admin-1', 'admin@test.com');

      expect(mockAuditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ─── softDelete ────────────────────────────────────────────────────────────
  describe('softDelete', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.softDelete('user-1', 'admin-1', 'admin@test.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('soft deletes user and logs audit', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUserEntity());
      mockUserRepo.update.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);

      await service.softDelete('user-1', 'admin-1', 'admin@test.com');

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_DELETED' }),
      );
    });
  });

  // ─── getStats ──────────────────────────────────────────────────────────────
  describe('getStats', () => {
    it('returns stats from all repositories', async () => {
      mockUserRepo.count.mockResolvedValue(100);
      mockQb.getCount.mockResolvedValue(50);
      mockBudgetRepo.count.mockResolvedValue(200);
      mockTransactionRepo.count.mockResolvedValue(1000);

      const result = await service.getStats();

      expect(result.totalUsers).toBe(100);
      expect(result.activeUsers).toBe(50);
      expect(result.totalBudgets).toBe(200);
      expect(result.totalTransactions).toBe(1000);
    });
  });
});
