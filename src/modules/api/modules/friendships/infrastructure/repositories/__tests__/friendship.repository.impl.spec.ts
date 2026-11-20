import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { FriendshipStatus } from '../../../domain/enums/friendship-status.enum';
import { FriendshipEntity } from '../../database/entities/friendship.entity';
import { FriendshipRepositoryImpl } from '../friendship.repository.impl';

const mockRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const makeFriendshipEntity = (overrides = {}) => ({
  id: 'fs-1',
  requesterId: 'user-1',
  addresseeId: 'user-2',
  status: FriendshipStatus.PENDING,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('FriendshipRepositoryImpl', () => {
  let repository: FriendshipRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipRepositoryImpl,
        { provide: getRepositoryToken(FriendshipEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<FriendshipRepositoryImpl>(FriendshipRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findByPair', () => {
    it('returns friendship when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeFriendshipEntity());
      const result = await repository.findByPair('user-1', 'user-2');
      expect(result).toMatchObject({ requesterId: 'user-1', addresseeId: 'user-2' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByPair('user-1', 'user-99');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns friendship when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeFriendshipEntity());
      const result = await repository.findById('fs-1');
      expect(result).toMatchObject({ id: 'fs-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('creates entity and saves friendship', async () => {
      const entity = makeFriendshipEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      const result = await repository.save({
        requesterId: 'user-1',
        addresseeId: 'user-2',
        status: FriendshipStatus.PENDING,
      });
      expect(result).toMatchObject({ id: 'fs-1' });
    });

    it('logs error and rethrows on save failure', async () => {
      const error = new Error('DB error');
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(error);
      await expect(
        repository.save({
          requesterId: 'user-1',
          addresseeId: 'user-2',
          status: FriendshipStatus.PENDING,
        }),
      ).rejects.toThrow('DB error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStatus', () => {
    it('updates friendship status', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.updateStatus('fs-1', FriendshipStatus.ACCEPTED);
      expect(mockRepo.update).toHaveBeenCalledWith('fs-1', { status: FriendshipStatus.ACCEPTED });
    });
  });

  describe('delete', () => {
    it('deletes friendship', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      await repository.delete('fs-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('fs-1');
    });
  });

  describe('findAcceptedByUserId', () => {
    it('returns accepted friendships for user', async () => {
      mockRepo.find.mockResolvedValue([
        makeFriendshipEntity({ status: FriendshipStatus.ACCEPTED }),
      ]);
      const result = await repository.findAcceptedByUserId('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findReceivedPending', () => {
    it('returns pending requests received by user', async () => {
      mockRepo.find.mockResolvedValue([makeFriendshipEntity()]);
      const result = await repository.findReceivedPending('user-2');
      expect(result).toHaveLength(1);
    });
  });

  describe('findSentPending', () => {
    it('returns pending requests sent by user', async () => {
      mockRepo.find.mockResolvedValue([makeFriendshipEntity()]);
      const result = await repository.findSentPending('user-1');
      expect(result).toHaveLength(1);
    });
  });
});
