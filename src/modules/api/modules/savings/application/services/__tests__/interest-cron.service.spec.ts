import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlannedSavingStatus } from '../../../domain/savings-planned';
import { InterestCronService } from '../interest-cron.service';

const mockGoalsRepo = { findActiveWithInterest: jest.fn() };
const mockPlannedSavingRepo = { findByGoalId: jest.fn() };
const mockBudgetRepo = { findByFinancesIdAndMonth: jest.fn() };
const mockFinancesRepo = { findByUserId: jest.fn() };
const mockCategoryRepo = { findByType: jest.fn() };
const mockTxManager = { save: jest.fn(), update: jest.fn() };
const mockDataSource = {
  transaction: jest
    .fn()
    .mockImplementation((cb: (m: typeof mockTxManager) => Promise<void>) => cb(mockTxManager)),
};
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeGoal = (overrides = {}) => ({
  id: 'goal-1',
  userId: 'user-1',
  name: 'Fondo de emergencia',
  status: 'IN_PROGRESS',
  lastInterestDate: null,
  createdAt: new Date('2024-01-01'),
  accountId: 'account-1',
  account: { interestRate: 5 }, // 5% annual
  ...overrides,
});

describe('InterestCronService', () => {
  let service: InterestCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterestCronService,
        { provide: 'GoalsRepository', useValue: mockGoalsRepo },
        { provide: 'PlannedSavingRepository', useValue: mockPlannedSavingRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'FinancesRepository', useValue: mockFinancesRepo },
        { provide: 'CategoryRepository', useValue: mockCategoryRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<InterestCronService>(InterestCronService);
    jest.clearAllMocks();
    mockDataSource.transaction.mockImplementation(
      (cb: (m: typeof mockTxManager) => Promise<void>) => cb(mockTxManager),
    );
  });

  describe('registerDailyInterest', () => {
    it('does nothing when there are no active goals', async () => {
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([]);
      await service.registerDailyInterest();
      expect(mockTxManager.save).not.toHaveBeenCalled();
    });

    it('skips goal when lastInterestDate is today', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([
        makeGoal({ lastInterestDate: today }),
      ]);
      await service.registerDailyInterest();
      expect(mockPlannedSavingRepo.findByGoalId).not.toHaveBeenCalled();
    });

    it('skips goal when annualRate is 0', async () => {
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([
        makeGoal({ account: { interestRate: 0 } }),
      ]);
      await service.registerDailyInterest();
      expect(mockPlannedSavingRepo.findByGoalId).not.toHaveBeenCalled();
    });

    it('skips goal when accumulatedAmount is 0', async () => {
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([makeGoal()]);
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([
        { status: PlannedSavingStatus.PENDING, amount: 500000 },
      ]);
      await service.registerDailyInterest();
      expect(mockFinancesRepo.findByUserId).not.toHaveBeenCalled();
    });

    it('skips when finances not found', async () => {
      const pastDate = new Date('2024-01-01');
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([
        makeGoal({ lastInterestDate: pastDate }),
      ]);
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([
        { status: PlannedSavingStatus.COMPLETED, amount: 1000000 },
      ]);
      mockFinancesRepo.findByUserId.mockResolvedValue(null);

      await service.registerDailyInterest();

      expect(mockBudgetRepo.findByFinancesIdAndMonth).not.toHaveBeenCalled();
    });

    it('skips when budget not found for current month', async () => {
      const pastDate = new Date('2024-01-01');
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([
        makeGoal({ lastInterestDate: pastDate }),
      ]);
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([
        { status: PlannedSavingStatus.COMPLETED, amount: 1000000 },
      ]);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finance-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue(null);

      await service.registerDailyInterest();

      expect(mockCategoryRepo.findByType).not.toHaveBeenCalled();
    });

    it('skips when savings category not found', async () => {
      const pastDate = new Date('2024-01-01');
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([
        makeGoal({ lastInterestDate: pastDate }),
      ]);
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([
        { status: PlannedSavingStatus.COMPLETED, amount: 1000000 },
      ]);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finance-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockCategoryRepo.findByType.mockResolvedValue(null);

      await service.registerDailyInterest();

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('registers interest transaction on happy path', async () => {
      const pastDate = new Date('2024-01-01');
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([
        makeGoal({ lastInterestDate: pastDate }),
      ]);
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([
        { status: PlannedSavingStatus.COMPLETED, amount: 1000000 },
      ]);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finance-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-1' });
      mockTxManager.save.mockResolvedValue({});
      mockTxManager.update.mockResolvedValue({});

      await service.registerDailyInterest();

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockTxManager.save).toHaveBeenCalledTimes(1);
      expect(mockTxManager.update).toHaveBeenCalledTimes(1);
    });

    it('swallows errors from a failing goal and continues', async () => {
      const pastDate = new Date('2024-01-01');
      const failGoal = makeGoal({ id: 'fail-goal', lastInterestDate: pastDate });
      const okGoal = makeGoal({ id: 'ok-goal', lastInterestDate: pastDate });
      mockGoalsRepo.findActiveWithInterest.mockResolvedValue([failGoal, okGoal]);
      mockPlannedSavingRepo.findByGoalId
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce([{ status: PlannedSavingStatus.COMPLETED, amount: 1000000 }]);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'finance-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-1' });
      mockTxManager.save.mockResolvedValue({});
      mockTxManager.update.mockResolvedValue({});

      await expect(service.registerDailyInterest()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });
});
