import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { FinancesEntity } from '../../database/entities/finances.entity';
import { FinancesRepositoryImpl } from '../finances.repository.impl';

const mockRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('FinancesRepositoryImpl', () => {
  let repository: FinancesRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancesRepositoryImpl,
        { provide: getRepositoryToken(FinancesEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<FinancesRepositoryImpl>(FinancesRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('creates entity and saves it', async () => {
      const finances = { userId: 'user-1', accountName: 'Principal' };
      mockRepo.create.mockReturnValue(finances);
      mockRepo.save.mockResolvedValue({ id: 'fin-1', ...finances });

      const result = await repository.save(finances as never);

      expect(mockRepo.create).toHaveBeenCalledWith(finances);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'fin-1' });
    });
  });

  describe('findByUserId', () => {
    it('returns finances when found', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'fin-1', userId: 'user-1' });
      const result = await repository.findByUserId('user-1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect((result as unknown as Record<string, unknown>).id).toBe('fin-1');
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByUserId('unknown');
      expect(result).toBeNull();
    });
  });
});
