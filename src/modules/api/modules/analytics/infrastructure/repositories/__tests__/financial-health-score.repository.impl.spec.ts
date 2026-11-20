import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { FinancialHealthScoreEntity } from '../../database/entities/financial-health-score.entity';
import { FinancialHealthScoreRepositoryImpl } from '../financial-health-score.repository.impl';

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
};

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const makeScoreEntity = (overrides = {}) => ({
  id: 'score-1',
  userId: 'user-1',
  totalScore: 75,
  level: 'GOOD',
  calculatedAt: new Date('2026-06-04T10:00:00Z'),
  ...overrides,
});

describe('FinancialHealthScoreRepositoryImpl', () => {
  let repository: FinancialHealthScoreRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialHealthScoreRepositoryImpl,
        { provide: getRepositoryToken(FinancialHealthScoreEntity), useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<FinancialHealthScoreRepositoryImpl>(FinancialHealthScoreRepositoryImpl);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('insert', () => {
    it('creates entity, saves and logs info', async () => {
      const entity = makeScoreEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const result = await repository.insert({
        userId: 'user-1',
        totalScore: 75,
        level: 'GOOD',
      } as never);

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'score-1', totalScore: 75 });
    });
  });

  describe('findRecentByUserId', () => {
    it('returns recent score when found within last hour', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(makeScoreEntity());
      const result = await repository.findRecentByUserId('user-1');
      expect(result).toMatchObject({ userId: 'user-1', totalScore: 75 });
    });

    it('returns null when no recent score found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await repository.findRecentByUserId('user-1');
      expect(result).toBeNull();
    });
  });
});
