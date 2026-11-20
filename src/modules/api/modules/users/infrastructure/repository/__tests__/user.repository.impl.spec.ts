import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { UserEntity } from '../../database/user.entity';
import { UserRepositoryImpl } from '../user.repository.impl';

const mockRepo = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const makeUserEntity = (overrides = {}) => ({
  id: 'user-1',
  email: 'juan@example.com',
  password: 'hashed-pw',
  handle: 'juangarcia',
  provider: 'local',
  onboarding: 'COMPLETED',
  timezone: 'America/Mexico_City',
  tokenVersion: 1,
  createdAt: new Date('2026-01-01'),
  userProfile: { id: 'profile-1', displayName: 'Juan García' },
  finances: { id: 'finance-1' },
  ...overrides,
});

describe('UserRepositoryImpl', () => {
  let repository: UserRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepositoryImpl,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<UserRepositoryImpl>(UserRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all users', async () => {
      mockRepo.find.mockResolvedValue([makeUserEntity(), makeUserEntity({ id: 'user-2' })]);
      const result = await repository.findAll();
      expect(result).toHaveLength(2);
    });

    it('logs error and rethrows on failure', async () => {
      const error = new Error('DB error');
      mockRepo.find.mockRejectedValue(error);
      await expect(repository.findAll()).rejects.toThrow('DB error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('save', () => {
    it('creates and saves user', async () => {
      const entity = makeUserEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      const result = await repository.save({
        email: 'juan@example.com',
        password: 'hashed-pw',
      } as never);
      expect(result).toMatchObject({ id: 'user-1' });
    });

    it('logs error and rethrows on save failure', async () => {
      const error = new Error('Duplicate');
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(error);
      await expect(repository.save({ email: 'juan@example.com' } as never)).rejects.toThrow(
        'Duplicate',
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByEmail', () => {
    it('returns user with profile when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeUserEntity());
      const result = await repository.findByEmail('juan@example.com');
      expect(result).toMatchObject({ email: 'juan@example.com' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findAuthById', () => {
    it('returns user with relations when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeUserEntity());
      const result = await repository.findAuthById('user-1');
      expect(result).toMatchObject({ id: 'user-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findAuthById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns mapped client user without password', async () => {
      mockRepo.findOne.mockResolvedValue(makeUserEntity());
      const result = await repository.findById('user-1');
      expect(result).toMatchObject({ id: 'user-1', email: 'juan@example.com' });
      expect(result).not.toHaveProperty('password');
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('completeOnboarding', () => {
    it('updates onboarding status to COMPLETED', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      await repository.completeOnboarding('user-1');
      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { onboarding: 'COMPLETED' });
    });

    it('logs error and rethrows on failure', async () => {
      const error = new Error('DB error');
      mockRepo.update.mockRejectedValue(error);
      await expect(repository.completeOnboarding('user-1')).rejects.toThrow('DB error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateTokens', () => {
    it('increments tokenVersion', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      await repository.invalidateTokens('user-1', 1);
      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { tokenVersion: 2 });
    });
  });

  describe('updatePassword', () => {
    it('updates password hash', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.updatePassword('user-1', 'new-hash');
      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { password: 'new-hash' });
    });
  });

  describe('findByHandle', () => {
    it('returns user when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeUserEntity());
      const result = await repository.findByHandle('juangarcia');
      expect(result).toMatchObject({ handle: 'juangarcia' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByHandle('unknown');
      expect(result).toBeNull();
    });
  });

  describe('searchByHandle', () => {
    it('returns filtered users excluding given userId', async () => {
      mockRepo.find.mockResolvedValue([
        makeUserEntity({ id: 'user-2', handle: 'juangarcia' }),
        makeUserEntity({ id: 'user-1', handle: 'juangarcia' }),
      ]);
      const result = await repository.searchByHandle('juan', 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('updateHandle', () => {
    it('updates user handle', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.updateHandle('user-1', 'nuevohandle');
      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { handle: 'nuevohandle' });
    });
  });

  describe('updateTimezone', () => {
    it('updates user timezone', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.updateTimezone('user-1', 'America/Bogota');
      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { timezone: 'America/Bogota' });
    });
  });
});
