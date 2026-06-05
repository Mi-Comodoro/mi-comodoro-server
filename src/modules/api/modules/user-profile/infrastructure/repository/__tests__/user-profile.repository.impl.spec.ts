import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { UserProfileEntity } from '../../database/entities/user-profile.entity';
import { UserProfileRepositoryImpl } from '../user-profile.repository.impl';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const makeProfileEntity = (overrides = {}) => ({
  id: 'profile-1',
  userId: 'user-1',
  firstName: 'Juan',
  lastName: 'García',
  phone: '+525512345678',
  gender: 'male',
  ...overrides,
});

describe('UserProfileRepositoryImpl', () => {
  let repository: UserProfileRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileRepositoryImpl,
        { provide: getRepositoryToken(UserProfileEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<UserProfileRepositoryImpl>(UserProfileRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('creates and saves user profile', async () => {
      const profile = makeProfileEntity();
      mockRepo.create.mockReturnValue(profile);
      mockRepo.save.mockResolvedValue(profile);
      const result = await repository.save({ userId: 'user-1', firstName: 'Juan' } as never);
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'profile-1' });
    });
  });

  describe('findById', () => {
    it('returns profile when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeProfileEntity());
      const result = await repository.findById('profile-1');
      expect(result).toMatchObject({ id: 'profile-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('returns profile when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeProfileEntity());
      const result = await repository.findByUserId('user-1');
      expect(result).toMatchObject({ userId: 'user-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByUserId('unknown');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates and returns updated profile', async () => {
      const existing = makeProfileEntity();
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({ ...existing, firstName: 'Carlos' });
      const result = await repository.update('user-1', { firstName: 'Carlos' } as never);
      expect(result).toMatchObject({ firstName: 'Carlos' });
    });

    it('throws NotFoundException when profile not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(repository.update('unknown', {} as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('existsByPhone', () => {
    it('returns true when phone exists', async () => {
      mockRepo.count.mockResolvedValue(1);
      const result = await repository.existsByPhone('+525512345678');
      expect(result).toBe(true);
    });

    it('returns false when phone does not exist', async () => {
      mockRepo.count.mockResolvedValue(0);
      const result = await repository.existsByPhone('+525599999999');
      expect(result).toBe(false);
    });
  });
});
