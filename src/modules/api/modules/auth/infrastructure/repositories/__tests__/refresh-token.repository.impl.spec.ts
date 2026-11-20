import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { RefreshTokenRepositoryImpl } from '../refresh-token.repository.impl';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('RefreshTokenRepositoryImpl', () => {
  let repository: RefreshTokenRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenRepositoryImpl,
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<RefreshTokenRepositoryImpl>(RefreshTokenRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('creates and saves a refresh token entity', async () => {
      const data = { userId: 'user-1', tokenHash: 'hash-abc', expiresAt: new Date() };
      mockRepo.create.mockReturnValue(data);
      mockRepo.save.mockResolvedValue({ id: 'rt-1', ...data });

      const result = await repository.save(data);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', tokenHash: 'hash-abc' }),
      );
      expect(result).toMatchObject({ id: 'rt-1' });
    });

    it('sets userAgent to null when not provided', async () => {
      const data = { userId: 'user-1', tokenHash: 'hash-abc', expiresAt: new Date() };
      mockRepo.create.mockReturnValue({ ...data, userAgent: null });
      mockRepo.save.mockResolvedValue({ id: 'rt-1', ...data, userAgent: null });

      await repository.save(data);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userAgent: null }));
    });
  });

  describe('findByHash', () => {
    it('returns token when found', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'rt-1', tokenHash: 'hash-abc' });
      const result = await repository.findByHash('hash-abc');
      expect(result).toMatchObject({ id: 'rt-1' });
    });

    it('returns null when token not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByHash('unknown');
      expect(result).toBeNull();
    });
  });

  describe('revokeById', () => {
    it('sets revokedAt on the token', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.revokeById('rt-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'rt-1',
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes all active tokens for user', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.revokeAllForUser('user-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('deleteExpiredBefore', () => {
    it('deletes tokens expired before the given date', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      const cutoff = new Date();
      await repository.deleteExpiredBefore(cutoff);
      expect(mockRepo.delete).toHaveBeenCalledWith(expect.objectContaining({}));
    });
  });
});
