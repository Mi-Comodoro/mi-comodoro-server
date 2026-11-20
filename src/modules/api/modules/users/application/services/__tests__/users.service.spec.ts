import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { UsersService } from '../users.service';

const mockUserRepo = {
  findByEmail: jest.fn(),
  findAuthById: jest.fn(),
  findById: jest.fn(),
  findByHandle: jest.fn(),
  updateHandle: jest.fn(),
  updateTimezone: jest.fn(),
  searchByHandle: jest.fn(),
};
const mockProfileRepo = {
  findByUserId: jest.fn(),
  update: jest.fn(),
  existsByPhone: jest.fn(),
};
const mockEventEmitter = { emitAsync: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'user@test.com',
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: 'UserRepository', useValue: mockUserRepo },
        { provide: 'UserProfileRepository', useValue: mockProfileRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    mockEventEmitter.emitAsync.mockResolvedValue([]);
  });

  // ─── checkPhoneAvailability ────────────────────────────────────────────────
  describe('checkPhoneAvailability', () => {
    it('returns available: true when phone is not registered', async () => {
      mockProfileRepo.existsByPhone.mockResolvedValue(false);
      const result = await service.checkPhoneAvailability('3001234567');
      expect(result.available).toBe(true);
    });

    it('returns available: false when phone is already registered', async () => {
      mockProfileRepo.existsByPhone.mockResolvedValue(true);
      const result = await service.checkPhoneAvailability('3001234567');
      expect(result.available).toBe(false);
    });

    it('normalizes phone by removing spaces, dashes, parentheses and dots', async () => {
      mockProfileRepo.existsByPhone.mockResolvedValue(false);
      await service.checkPhoneAvailability('(300) 123-45.67');
      expect(mockProfileRepo.existsByPhone).toHaveBeenCalledWith('3001234567');
    });

    it('rethrows errors from the repository', async () => {
      mockProfileRepo.existsByPhone.mockRejectedValue(new Error('DB error'));
      await expect(service.checkPhoneAvailability('3001234567')).rejects.toThrow('DB error');
    });
  });

  // ─── getCurrentUser ────────────────────────────────────────────────────────
  describe('getCurrentUser', () => {
    const payload = { userId: 'user-1', email: 'user@test.com', role: 'user', tokenVersion: 0 };

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.getCurrentUser(payload as never)).rejects.toThrow(NotFoundException);
    });

    it('returns user for a valid payload', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser());
      const result = await service.getCurrentUser(payload as never);
      expect(result.id).toBe('user-1');
    });
  });

  // ─── updateMe ──────────────────────────────────────────────────────────────
  describe('updateMe', () => {
    it('throws NotFoundException when profile does not exist', async () => {
      mockProfileRepo.findByUserId.mockResolvedValue(null);
      await expect(service.updateMe('u-1', { timezone: 'America/Bogota' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates timezone when provided', async () => {
      mockProfileRepo.findByUserId.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
      mockProfileRepo.update.mockResolvedValue({ id: 'profile-1' });

      await service.updateMe('user-1', { timezone: 'America/Bogota' });
      expect(mockUserRepo.updateTimezone).toHaveBeenCalledWith('user-1', 'America/Bogota');
    });

    it('does not update timezone when not in payload', async () => {
      mockProfileRepo.findByUserId.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
      mockProfileRepo.update.mockResolvedValue({ id: 'profile-1' });

      await service.updateMe('user-1', { displayName: 'Nuevo' } as never);
      expect(mockUserRepo.updateTimezone).not.toHaveBeenCalled();
    });

    it('merges existing profile fields and returns updated profile', async () => {
      const existing = { id: 'profile-1', userId: 'user-1', displayName: 'Viejo' };
      mockProfileRepo.findByUserId.mockResolvedValue(existing);
      mockProfileRepo.update.mockResolvedValue({ ...existing, displayName: 'Nuevo' });

      const result = await service.updateMe('user-1', { displayName: 'Nuevo' } as never);
      expect((result as unknown as Record<string, unknown>).displayName).toBe('Nuevo');
    });
  });

  // ─── updateHandle ──────────────────────────────────────────────────────────
  describe('updateHandle', () => {
    it('throws ConflictException when handle is taken by another user', async () => {
      mockUserRepo.findByHandle.mockResolvedValue(makeUser({ id: 'other-user' }));
      await expect(service.updateHandle('user-1', { handle: 'taken' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('allows updating to the same handle (same user)', async () => {
      mockUserRepo.findByHandle.mockResolvedValue(makeUser({ id: 'user-1' }));
      mockUserRepo.updateHandle.mockResolvedValue(undefined);

      const result = await service.updateHandle('user-1', { handle: 'myhandle' });
      expect(result.handle).toBe('myhandle');
    });

    it('allows handle when not taken by anyone', async () => {
      mockUserRepo.findByHandle.mockResolvedValue(null);
      mockUserRepo.updateHandle.mockResolvedValue(undefined);

      const result = await service.updateHandle('user-1', { handle: 'newhandle' });
      expect(result.handle).toBe('newhandle');
    });
  });

  // ─── searchUsers ───────────────────────────────────────────────────────────
  describe('searchUsers', () => {
    it('delegates to the repository with query and requesting user', async () => {
      mockUserRepo.searchByHandle.mockResolvedValue([makeUser()]);

      const result = await service.searchUsers('john', 'user-1');
      expect(mockUserRepo.searchByHandle).toHaveBeenCalledWith('john', 'user-1');
      expect(result).toHaveLength(1);
    });
  });
});
