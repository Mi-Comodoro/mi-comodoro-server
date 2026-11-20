import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { SavingAllocationService } from '../allocations.service';

const mockAllocationRepo = {
  create: jest.fn(),
  find: jest.fn(),
  replaceForBudget: jest.fn(),
};

const mockBudgetRepo = {
  findById: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('SavingAllocationService', () => {
  let service: SavingAllocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavingAllocationService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'SavingAllocationRepository', useValue: mockAllocationRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
      ],
    }).compile();

    service = module.get<SavingAllocationService>(SavingAllocationService);
    jest.clearAllMocks();
  });

  // ─── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('delegates to repository and returns result', async () => {
      const data = { goalId: 'goal-1', percentage: 50, budgetId: 'budget-1' } as never;
      mockAllocationRepo.create.mockResolvedValue(data);

      const result = await service.create(data);

      expect(mockAllocationRepo.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(data);
    });
  });

  // ─── find ──────────────────────────────────────────────────────────────────
  describe('find', () => {
    it('returns allocations for a given budget', async () => {
      mockAllocationRepo.find.mockResolvedValue([{ goalId: 'goal-1', percentage: 50 }]);

      const result = await service.find('budget-1');

      expect(mockAllocationRepo.find).toHaveBeenCalledWith('budget-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── replace ───────────────────────────────────────────────────────────────
  describe('replace', () => {
    const distributions = [
      { goalId: 'goal-1', percentage: 40 },
      { goalId: 'goal-2', percentage: 30 },
    ];

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.replace('user-1', 'budget-1', distributions as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when budget belongs to different user', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ id: 'budget-1', ownerId: 'other-user' });
      await expect(service.replace('user-1', 'budget-1', distributions as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when percentages sum exceeds 100', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ id: 'budget-1', ownerId: 'user-1' });
      const over = [
        { goalId: 'g-1', percentage: 60 },
        { goalId: 'g-2', percentage: 50 },
      ];
      await expect(service.replace('user-1', 'budget-1', over as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts exactly 100% without throwing', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ id: 'budget-1', ownerId: 'user-1' });
      mockAllocationRepo.replaceForBudget.mockResolvedValue([]);
      const exact = [
        { goalId: 'g-1', percentage: 60 },
        { goalId: 'g-2', percentage: 40 },
      ];
      await expect(service.replace('user-1', 'budget-1', exact as never)).resolves.not.toThrow();
    });

    it('calls replaceForBudget with correct data and returns result', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ id: 'budget-1', ownerId: 'user-1' });
      mockAllocationRepo.replaceForBudget.mockResolvedValue([
        { goalId: 'goal-1', percentage: 40, budgetId: 'budget-1' },
        { goalId: 'goal-2', percentage: 30, budgetId: 'budget-1' },
      ]);

      const result = await service.replace('user-1', 'budget-1', distributions as never);

      expect(mockAllocationRepo.replaceForBudget).toHaveBeenCalledWith('budget-1', [
        { goalId: 'goal-1', percentage: 40, budgetId: 'budget-1' },
        { goalId: 'goal-2', percentage: 30, budgetId: 'budget-1' },
      ]);
      expect(result).toHaveLength(2);
    });
  });
});
