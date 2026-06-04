import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlannedIncomeService } from '../planned-income.service';

const mockPlannedIncomeRepo = {
  findByBudgetId: jest.fn(),
  findAllPlanedIncomes: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn(),
};

const mockPlannedSavingRepo = {
  saveMany: jest.fn(),
};

const mockAllocationRepo = {
  find: jest.fn(),
};

const mockBudgetRepo = {
  findById: jest.fn(),
};

const mockTransactionRepo = {
  save: jest.fn(),
};

const mockCategoryRepo = {
  findByType: jest.fn(),
};

const mockAccountRepo = {
  findPrimaryByUserId: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const activeBudget = {
  id: 'b-1',
  ownerId: 'u-1',
  status: 'ACTIVE',
  savingsLimit: 30,
};

describe('PlannedIncomeService', () => {
  let service: PlannedIncomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannedIncomeService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'PlannedIncomeRepository', useValue: mockPlannedIncomeRepo },
        { provide: 'PlannedSavingRepository', useValue: mockPlannedSavingRepo },
        { provide: 'SavingAllocationRepository', useValue: mockAllocationRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'TransactionRepository', useValue: mockTransactionRepo },
        { provide: 'CategoryRepository', useValue: mockCategoryRepo },
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PlannedIncomeService>(PlannedIncomeService);
    jest.clearAllMocks();
  });

  describe('getByBudgetId', () => {
    it('lanza NotFoundException si el budget no existe', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.getByBudgetId('b-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el budget no pertenece al usuario', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ ...activeBudget, ownerId: 'otro-user' });
      await expect(service.getByBudgetId('b-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna los planned incomes del budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockPlannedIncomeRepo.findByBudgetId.mockResolvedValue([{ id: 'pi-1' }]);
      const result = await service.getByBudgetId('b-1', 'u-1');
      expect(result).toHaveLength(1);
      expect(mockPlannedIncomeRepo.findByBudgetId).toHaveBeenCalledWith('b-1');
    });
  });

  describe('findAll', () => {
    it('retorna array vacío si no hay planned incomes', async () => {
      mockPlannedIncomeRepo.findAllPlanedIncomes.mockResolvedValue([]);
      const result = await service.findAll('u-1');
      expect(result).toEqual([]);
    });

    it('retorna solo los planned incomes cuyos budgets pertenecen al usuario', async () => {
      mockPlannedIncomeRepo.findAllPlanedIncomes.mockResolvedValue([
        { id: 'pi-1', budgetId: 'b-1' },
        { id: 'pi-2', budgetId: 'b-2' },
        { id: 'pi-3', budgetId: undefined },
      ]);
      mockBudgetRepo.findById.mockImplementation((id: string) => {
        if (id === 'b-1') return Promise.resolve({ id: 'b-1', ownerId: 'u-1' });
        if (id === 'b-2') return Promise.resolve({ id: 'b-2', ownerId: 'otro-user' });
        return Promise.resolve(null);
      });
      const result = await service.findAll('u-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pi-1');
    });

    it('ignora planned incomes sin budgetId', async () => {
      mockPlannedIncomeRepo.findAllPlanedIncomes.mockResolvedValue([
        { id: 'pi-1', budgetId: undefined },
      ]);
      const result = await service.findAll('u-1');
      expect(result).toHaveLength(0);
      expect(mockBudgetRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe('createManual', () => {
    const validData = {
      budgetId: 'b-1',
      amount: 1000,
      date: new Date('2026-06-01'),
      source: 'Freelance',
    };

    it('lanza NotFoundException si el budget no existe', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.createManual(validData, 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el budget no pertenece al usuario', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ ...activeBudget, ownerId: 'otro-user' });
      await expect(service.createManual(validData, 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si source está vacío', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      await expect(service.createManual({ ...validData, source: '   ' }, 'u-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si amount es 0', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      await expect(service.createManual({ ...validData, amount: 0 }, 'u-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si amount es negativo', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      await expect(service.createManual({ ...validData, amount: -100 }, 'u-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('crea el planned income con source recortado', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockPlannedIncomeRepo.create.mockResolvedValue({ id: 'pi-1', ...validData });
      const result = await service.createManual({ ...validData, source: '  Freelance  ' }, 'u-1');
      expect(mockPlannedIncomeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Freelance', status: 'PENDING' }),
      );
      expect(result.id).toBe('pi-1');
    });

    it('crea el planned income correctamente con datos válidos', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockPlannedIncomeRepo.create.mockResolvedValue({ id: 'pi-new', ...validData });
      const result = await service.createManual(validData, 'u-1');
      expect(result.id).toBe('pi-new');
    });
  });

  describe('createUnplannedIncome', () => {
    const validData = {
      userId: 'u-1',
      amount: 500,
      source: 'Bono',
      budgetId: 'b-1',
      date: new Date('2026-06-01'),
    };

    it('lanza NotFoundException si el budget no existe', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.createUnplannedIncome(validData)).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el budget no está activo', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ ...activeBudget, status: 'CLOSED' });
      await expect(service.createUnplannedIncome(validData)).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el budget no pertenece al usuario', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ ...activeBudget, ownerId: 'otro-user' });
      await expect(service.createUnplannedIncome(validData)).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si source está vacío', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      await expect(service.createUnplannedIncome({ ...validData, source: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si amount es 0 o negativo', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      await expect(service.createUnplannedIncome({ ...validData, amount: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza NotFoundException si la categoría income no existe', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockCategoryRepo.findByType.mockResolvedValue(null);
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
      await expect(service.createUnplannedIncome(validData)).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si no hay allocations definidas', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-income' });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockAllocationRepo.find.mockResolvedValue([]);
      await expect(service.createUnplannedIncome(validData)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si las allocations no suman 100%', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-income' });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockAllocationRepo.find.mockResolvedValue([
        { goalId: 'g-1', percentage: 60, goal: { accountId: 'acc-1' } },
      ]);
      await expect(service.createUnplannedIncome(validData)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si un goal de allocation no tiene accountId', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-income' });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockAllocationRepo.find.mockResolvedValue([
        { goalId: 'g-1', percentage: 100, goal: { accountId: null } },
      ]);
      await expect(service.createUnplannedIncome(validData)).rejects.toThrow(BadRequestException);
    });

    it('crea transacción y planned savings exitosamente', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-income' });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockAllocationRepo.find.mockResolvedValue([
        { goalId: 'g-1', percentage: 100, goal: { accountId: 'acc-1' } },
      ]);
      mockPlannedSavingRepo.saveMany.mockResolvedValue([{ id: 'ps-1' }]);

      const result = await service.createUnplannedIncome(validData);
      expect(result.transaction).toBeDefined();
      expect(result.plannedSavings).toHaveLength(1);
    });

    it('crea la transacción con los datos correctos', async () => {
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-income' });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue({ id: 'primary-acc' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockAllocationRepo.find.mockResolvedValue([
        { goalId: 'g-1', percentage: 100, goal: { accountId: 'acc-1' } },
      ]);
      mockPlannedSavingRepo.saveMany.mockResolvedValue([{ id: 'ps-1' }]);

      await service.createUnplannedIncome(validData);
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          amount: 500,
          source: 'Bono',
          budgetId: 'b-1',
          categoryId: 'cat-income',
          toAccountId: 'primary-acc',
        }),
      );
    });

    it('calcula el monto de savings correctamente según savingsLimit', async () => {
      mockBudgetRepo.findById.mockResolvedValue({ ...activeBudget, savingsLimit: 20 });
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-income' });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockAllocationRepo.find.mockResolvedValue([
        { goalId: 'g-1', percentage: 100, goal: { accountId: 'acc-1' } },
      ]);
      mockPlannedSavingRepo.saveMany.mockResolvedValue([{ id: 'ps-1', amount: 100 }]);

      await service.createUnplannedIncome({ ...validData, amount: 500 });
      expect(mockPlannedSavingRepo.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ amount: 100 })]),
      );
    });
  });

  describe('deletePlannedIncome', () => {
    it('lanza NotFoundException si el planned income no existe', async () => {
      mockPlannedIncomeRepo.findById.mockResolvedValue(null);
      await expect(service.deletePlannedIncome('pi-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el planned income no tiene budgetId', async () => {
      mockPlannedIncomeRepo.findById.mockResolvedValue({ id: 'pi-1', budgetId: undefined });
      await expect(service.deletePlannedIncome('pi-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el budget no pertenece al usuario', async () => {
      mockPlannedIncomeRepo.findById.mockResolvedValue({ id: 'pi-1', budgetId: 'b-1' });
      mockBudgetRepo.findById.mockResolvedValue({ ...activeBudget, ownerId: 'otro-user' });
      await expect(service.deletePlannedIncome('pi-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('elimina el planned income correctamente', async () => {
      mockPlannedIncomeRepo.findById.mockResolvedValue({ id: 'pi-1', budgetId: 'b-1' });
      mockBudgetRepo.findById.mockResolvedValue(activeBudget);
      mockPlannedIncomeRepo.delete.mockResolvedValue(undefined);
      await service.deletePlannedIncome('pi-1', 'u-1');
      expect(mockPlannedIncomeRepo.delete).toHaveBeenCalledWith('pi-1');
    });
  });
});
