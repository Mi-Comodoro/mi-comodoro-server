import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AccountRateHistoryEntity } from '../../database/account-rate-history.entity';
import { AccountRateHistoryRepositoryImpl } from '../account-rate-history.repository.impl';

const mockRepo = { save: jest.fn(), find: jest.fn() };

describe('AccountRateHistoryRepositoryImpl', () => {
  let repository: AccountRateHistoryRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRateHistoryRepositoryImpl,
        { provide: getRepositoryToken(AccountRateHistoryEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<AccountRateHistoryRepositoryImpl>(AccountRateHistoryRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('maps to entity, saves, and returns domain object', async () => {
      const data = { accountId: 'acc-1', interestRate: 3.5, changedAt: new Date() };
      mockRepo.save.mockResolvedValue({ id: 'rh-1', ...data });

      const result = await repository.save(data as never);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ accountId: 'acc-1' });
    });
  });

  describe('findByAccount', () => {
    it('returns rate history for account ordered DESC', async () => {
      const entries = [
        { id: 'rh-2', accountId: 'acc-1' },
        { id: 'rh-1', accountId: 'acc-1' },
      ];
      mockRepo.find.mockResolvedValue(entries);

      const result = await repository.findByAccount('acc-1');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { accountId: 'acc-1' },
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no history', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findByAccount('acc-1');
      expect(result).toEqual([]);
    });
  });
});
