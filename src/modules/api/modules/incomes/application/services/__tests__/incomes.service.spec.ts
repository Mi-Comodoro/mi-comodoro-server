import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { IncomesService } from '../incomes.service';

const mockRepo = { findCurrentMonthIncomes: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('IncomesService', () => {
  let service: IncomesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomesService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'IncomesRepository', useValue: mockRepo },
      ],
    }).compile();

    service = module.get<IncomesService>(IncomesService);
    jest.clearAllMocks();
  });

  describe('calculateMonthlyIncomeSum', () => {
    it('returns income summary from repository', async () => {
      const summary = {
        expectedIncomes: [{ source: 'Salary', amount: 3000000, date: new Date() }],
        totalExpectedIncomes: 3000000,
        lastUpdate: new Date(),
      };
      mockRepo.findCurrentMonthIncomes.mockResolvedValue(summary);

      const result = await service.calculateMonthlyIncomeSum('user-1', 6, 2024);

      expect(mockRepo.findCurrentMonthIncomes).toHaveBeenCalledWith('user-1', 6, 2024);
      expect(result.totalExpectedIncomes).toBe(3000000);
      expect(result.expectedIncomes).toHaveLength(1);
    });

    it('returns empty summary when no incomes', async () => {
      const empty = { expectedIncomes: [], totalExpectedIncomes: 0, lastUpdate: new Date() };
      mockRepo.findCurrentMonthIncomes.mockResolvedValue(empty);

      const result = await service.calculateMonthlyIncomeSum('user-1', 1, 2024);

      expect(result.expectedIncomes).toHaveLength(0);
      expect(result.totalExpectedIncomes).toBe(0);
    });
  });
});
