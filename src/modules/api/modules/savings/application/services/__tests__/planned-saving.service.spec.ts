import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlannedSavingStatus } from '../../../domain/savings-planned';
import { PlannedSavingService } from '../planned-saving.service';

const mockPlannedSavingRepo = {
  findByBudget: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  saveMany: jest.fn(),
  update: jest.fn(),
  findByGoalId: jest.fn(),
};
const mockGoalsRepo = { findByIdAndUser: jest.fn(), findById: jest.fn(), update: jest.fn() };
const mockGoalHistoryRepo = { add: jest.fn() };
const mockBudgetRepo = { findById: jest.fn() };
const mockCategoryRepo = { findByType: jest.fn() };
const mockAccountRepo = { findPrimaryByUserId: jest.fn(), findByIdAndUser: jest.fn() };
const mockAllocationRepo = { find: jest.fn() };
const mockManager = { update: jest.fn(), save: jest.fn() };
const mockDataSource = { transaction: jest.fn(), getRepository: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeBudget = (overrides = {}) => ({
  id: 'budget-1',
  ownerId: 'user-1',
  status: 'ACTIVE',
  ...overrides,
});

const makeSaving = (overrides = {}) => ({
  id: 'ps-1',
  budgetId: 'budget-1',
  amount: 500,
  status: PlannedSavingStatus.PENDING,
  savingGoalId: 'goal-1',
  accountId: 'acc-1',
  ...overrides,
});

describe('PlannedSavingService', () => {
  let service: PlannedSavingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannedSavingService,
        { provide: 'PlannedSavingRepository', useValue: mockPlannedSavingRepo },
        { provide: 'GoalsRepository', useValue: mockGoalsRepo },
        { provide: 'GoalHistoryRepository', useValue: mockGoalHistoryRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'CategoryRepository', useValue: mockCategoryRepo },
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: 'SavingAllocationRepository', useValue: mockAllocationRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PlannedSavingService>(PlannedSavingService);
    jest.clearAllMocks();
    mockDataSource.transaction.mockImplementation((cb: (m: typeof mockManager) => unknown) =>
      cb(mockManager),
    );
    mockManager.update.mockResolvedValue(undefined);
    mockManager.save.mockResolvedValue({ id: 'tx-1' });
  });

  // ─── findByBudget ──────────────────────────────────────────────────────────
  describe('findByBudget', () => {
    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.findByBudget('budget-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when user is not the owner', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other-user' }));
      await expect(service.findByBudget('budget-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns planned savings for owned budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockPlannedSavingRepo.findByBudget.mockResolvedValue([makeSaving()]);
      const result = await service.findByBudget('budget-1', 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    const baseDto = { budgetId: 'budget-1', amount: 500 };

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.create('user-1', baseDto as never)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the budget owner', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other-user' }));
      await expect(service.create('user-1', baseDto as never)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when budget is not active', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ status: 'CLOSED' }));
      await expect(service.create('user-1', baseDto as never)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when plannedIncomeId not found in budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockDataSource.getRepository.mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) });
      await expect(
        service.create('user-1', { ...baseDto, plannedIncomeId: 'income-1' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when savingGoalId goal not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(
        service.create('user-1', { ...baseDto, savingGoalId: 'goal-1' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when goal has no accountId', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({ id: 'goal-1', accountId: null });
      await expect(
        service.create('user-1', { ...baseDto, savingGoalId: 'goal-1' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates single saving linked to goal when savingGoalId provided', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({ id: 'goal-1', accountId: 'acc-1' });
      mockPlannedSavingRepo.save.mockResolvedValue(makeSaving());
      const result = await service.create('user-1', {
        ...baseDto,
        savingGoalId: 'goal-1',
      } as never);
      expect(mockPlannedSavingRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('creates single unlinked saving when no valid allocations exist', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockAllocationRepo.find.mockResolvedValue([]);
      mockPlannedSavingRepo.save.mockResolvedValue(makeSaving({ savingGoalId: undefined }));
      const result = await service.create('user-1', baseDto as never);
      expect(mockPlannedSavingRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('distributes savings across allocations when they exist', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockAllocationRepo.find.mockResolvedValue([
        { goalId: 'goal-1', percentage: 60, goal: { accountId: 'acc-1' } },
        { goalId: 'goal-2', percentage: 40, goal: { accountId: 'acc-2' } },
      ]);
      mockPlannedSavingRepo.saveMany.mockResolvedValue([makeSaving(), makeSaving({ id: 'ps-2' })]);
      const result = await service.create('user-1', baseDto as never);
      expect(mockPlannedSavingRepo.saveMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('allocates correct amounts based on percentage', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockAllocationRepo.find.mockResolvedValue([
        { goalId: 'goal-1', percentage: 60, goal: { accountId: 'acc-1' } },
        { goalId: 'goal-2', percentage: 40, goal: { accountId: 'acc-2' } },
      ]);
      mockPlannedSavingRepo.saveMany.mockImplementation((items: Array<{ amount: number }>) =>
        Promise.resolve(items),
      );
      await service.create('user-1', baseDto as never);
      expect(mockPlannedSavingRepo.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ amount: 300 }),
          expect.objectContaining({ amount: 200 }),
        ]),
      );
    });
  });

  // ─── assignGoal ────────────────────────────────────────────────────────────
  describe('assignGoal', () => {
    it('throws NotFoundException when saving not found', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(null);
      await expect(service.assignGoal('ps-1', 'goal-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when saving is not PENDING', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(
        makeSaving({ status: PlannedSavingStatus.COMPLETED }),
      );
      await expect(service.assignGoal('ps-1', 'goal-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when budget not found', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.assignGoal('ps-1', 'goal-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when user is not the budget owner', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other-user' }));
      await expect(service.assignGoal('ps-1', 'goal-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when goal not found', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(service.assignGoal('ps-1', 'goal-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when goal has no accountId', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({ id: 'goal-1', accountId: null });
      await expect(service.assignGoal('ps-1', 'goal-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when repository update returns null', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({ id: 'goal-1', accountId: 'acc-1' });
      mockPlannedSavingRepo.update.mockResolvedValue(null);
      await expect(service.assignGoal('ps-1', 'goal-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('assigns goal and returns updated saving', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({ id: 'goal-1', accountId: 'acc-1' });
      mockPlannedSavingRepo.update.mockResolvedValue(makeSaving());
      const result = await service.assignGoal('ps-1', 'goal-1', 'user-1');
      expect(mockPlannedSavingRepo.update).toHaveBeenCalledWith('ps-1', {
        savingGoalId: 'goal-1',
        accountId: 'acc-1',
      });
      expect(result.id).toBe('ps-1');
    });
  });

  // ─── markAsDone ────────────────────────────────────────────────────────────
  describe('markAsDone', () => {
    it('throws NotFoundException when planned saving not found', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(null);
      await expect(service.markAsDone('ps-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when saving is already completed', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(
        makeSaving({ status: PlannedSavingStatus.COMPLETED }),
      );
      await expect(service.markAsDone('ps-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when budget not found', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.markAsDone('ps-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when user is not the budget owner', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other-user' }));
      await expect(service.markAsDone('ps-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when savings category not found', async () => {
      mockPlannedSavingRepo.findById.mockResolvedValue(makeSaving());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findByType.mockResolvedValue(null);
      mockGoalsRepo.findById.mockResolvedValue(null);
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
      await expect(service.markAsDone('ps-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('completes saving without interest when interestRate is 0', async () => {
      mockPlannedSavingRepo.findById
        .mockResolvedValueOnce(makeSaving())
        .mockResolvedValueOnce(makeSaving({ status: PlannedSavingStatus.COMPLETED }));
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-1' });
      mockGoalsRepo.findById.mockResolvedValue({
        id: 'goal-1',
        name: 'Viaje',
        accountId: 'acc-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
      });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue({ id: 'primary-acc' });
      mockAccountRepo.findByIdAndUser.mockResolvedValue({ interestRate: 0 });

      const result = await service.markAsDone('ps-1', 'user-1');

      expect(mockManager.update).toHaveBeenCalledTimes(1);
      expect(mockManager.save).toHaveBeenCalledTimes(1);
      expect(result.interestTransaction).toBeNull();
    });

    it('creates interest transaction when interestRate > 0 and accumulated savings > 0', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      mockPlannedSavingRepo.findById
        .mockResolvedValueOnce(makeSaving())
        .mockResolvedValueOnce(makeSaving({ status: PlannedSavingStatus.COMPLETED }));
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-1' });
      mockGoalsRepo.findById.mockResolvedValue({
        id: 'goal-1',
        name: 'Viaje',
        accountId: 'acc-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
        lastInterestDate: thirtyDaysAgo,
      });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue({ id: 'primary-acc' });
      mockAccountRepo.findByIdAndUser.mockResolvedValue({ interestRate: 5 });
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([
        { status: PlannedSavingStatus.COMPLETED, amount: 1000 },
      ]);
      mockManager.save
        .mockResolvedValueOnce({ id: 'savings-tx' })
        .mockResolvedValueOnce({ id: 'interest-tx' });

      const result = await service.markAsDone('ps-1', 'user-1');

      expect(mockManager.save).toHaveBeenCalledTimes(2);
      expect(result.interestTransaction).toMatchObject({ id: 'interest-tx' });
    });

    it('updates goal status from SCHEDULED to IN_PROGRESS after completing saving', async () => {
      mockPlannedSavingRepo.findById
        .mockResolvedValueOnce(makeSaving())
        .mockResolvedValueOnce(makeSaving({ status: PlannedSavingStatus.COMPLETED }));
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-1' });
      mockGoalsRepo.findById.mockResolvedValue({
        id: 'goal-1',
        name: 'Viaje',
        accountId: 'acc-1',
        userId: 'user-1',
        status: 'SCHEDULED',
      });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue({ id: 'primary-acc' });
      mockAccountRepo.findByIdAndUser.mockResolvedValue({ interestRate: 0 });
      mockGoalsRepo.update.mockResolvedValue(undefined);
      mockGoalHistoryRepo.add.mockResolvedValue(undefined);

      await service.markAsDone('ps-1', 'user-1');

      expect(mockGoalsRepo.update).toHaveBeenCalledWith(
        'goal-1',
        'user-1',
        expect.objectContaining({ status: 'IN_PROGRESS' }),
      );
    });
  });
});
