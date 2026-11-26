import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { PlannedExpenseStatus } from '../../../domain/expenses';
import { ExpenseService } from '../expense.service';

const mockExpenseRepo = {
  findById: jest.fn(),
  add: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
};
const mockBudgetRepo = { findById: jest.fn() };
const mockTransactionRepo = { save: jest.fn(), getBudgetTotals: jest.fn() };
const mockCategoryRepo = { findById: jest.fn() };
const mockAccountRepo = { findPrimaryByUserId: jest.fn() };
// Constructor de consultas encadenable: cada getRawOne devuelve un total (ingresos, ahorros, gastos)
const mockQuery = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
};
const mockManager = {
  query: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQuery),
};
const mockDataSource = {
  transaction: jest.fn(async (callback: (manager: typeof mockManager) => unknown) =>
    callback(mockManager),
  ),
};

// Totales planificados del presupuesto, en el orden en que se consultan
const plannedTotals = (
  income: number,
  savings: number,
  expenses: number,
  { pending = 0, available = 0 }: { pending?: number; available?: number } = {},
) => {
  mockQuery.getRawOne
    .mockResolvedValueOnce({ total: String(income) })
    .mockResolvedValueOnce({ total: String(savings) })
    .mockResolvedValueOnce({ total: String(expenses) })
    .mockResolvedValueOnce({ total: String(pending) });
  // Saldo disponible real = ingresos - gastos - ahorros registrados
  mockTransactionRepo.getBudgetTotals.mockResolvedValue({
    income: available,
    expense: 0,
    savings: 0,
  });
};
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

const makeExpense = (overrides = {}) => ({
  id: 'exp-1',
  budgetId: 'budget-1',
  categoryId: 'cat-1',
  name: 'Netflix',
  expectedAmount: 50000,
  status: PlannedExpenseStatus.PLANNED,
  isEssential: false,
  dueDate: new Date('2024-06-15'),
  ...overrides,
});

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: 'PlannedExpenseRepository', useValue: mockExpenseRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'TransactionRepository', useValue: mockTransactionRepo },
        { provide: 'CategoryRepository', useValue: mockCategoryRepo },
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    jest.clearAllMocks();
    mockQuery.getRawOne.mockReset();
    mockManager.save.mockImplementation(async (a: unknown, b?: object) => b ?? a);
    mockTransactionRepo.getBudgetTotals.mockResolvedValue({
      income: 1000000,
      expense: 0,
      savings: 0,
    });
  });

  // ─── addPlan ───────────────────────────────────────────────────────────────
  describe('addPlan', () => {
    const dto = {
      budgetId: 'budget-1',
      categoryId: 'cat-1',
      name: 'Netflix',
      expectedAmount: 50000,
      dueDate: '2024-06-15',
      status: PlannedExpenseStatus.PLANNED,
      isEssential: false,
    };

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.addPlan(dto as never, 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.addPlan(dto as never, 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('guarda el gasto planificado cuando cabe en los ingresos esperados menos los ahorros', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      plannedTotals(1000000, 200000, 300000); // quedan 500.000 por planificar

      const result = await service.addPlan(dto as never, 'user-1');

      expect(mockManager.query).toHaveBeenCalledWith(expect.stringContaining('FOR NO KEY UPDATE'), [
        'budget-1',
      ]);
      expect(mockManager.save).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Netflix');
    });

    it('no guarda un gasto planificado que supera lo que queda tras separar los ahorros', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      plannedTotals(1000000, 800000, 100000); // quedan 100.000 y el gasto es de 150.000

      await expect(
        service.addPlan({ ...dto, expectedAmount: 150000 } as never, 'user-1'),
      ).rejects.toThrow(/supera lo que te queda por planificar: \$100\.000,00/);
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('no guarda un gasto planificado si no hay ingresos esperados ni saldo disponible', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      plannedTotals(0, 0, 0);

      await expect(service.addPlan(dto as never, 'user-1')).rejects.toThrow(
        'Aún no tienes ingresos esperados ni saldo disponible para planificar gastos.',
      );
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('permite planificar con el saldo disponible aunque no haya ingresos esperados', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      plannedTotals(0, 0, 0, { available: 80000 });

      await service.addPlan(dto as never, 'user-1'); // 50.000 caben en 80.000

      expect(mockManager.save).toHaveBeenCalledTimes(1);
    });

    it('con saldo disponible descuenta lo ya planificado y sin pagar', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      plannedTotals(0, 0, 60000, { pending: 60000, available: 80000 }); // quedan 20.000

      await expect(service.addPlan(dto as never, 'user-1')).rejects.toThrow(
        /te queda por planificar: \$20\.000,00/,
      );
    });

    it('vale la opción con más holgura entre ingresos esperados y saldo disponible', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      // ingresos esperados dejan 0 (1.000.000 - 1.000.000) pero el saldo real alcanza
      plannedTotals(1000000, 1000000, 0, { available: 200000 });

      await service.addPlan(dto as never, 'user-1');

      expect(mockManager.save).toHaveBeenCalledTimes(1);
    });

    it('un gasto planificado cancelado no se valida contra los ingresos', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());

      await service.addPlan({ ...dto, status: PlannedExpenseStatus.CANCELED } as never, 'user-1');

      expect(mockQuery.getRawOne).not.toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('referencias a grupos y facturas', () => {
    const findOne = jest.fn();
    const dto = { budgetId: 'b-1', name: 'x', expectedAmount: 1000, dueDate: '2026-11-28' };

    beforeEach(() => {
      mockBudgetRepo.findById.mockResolvedValue({ id: 'b-1', ownerId: 'user-1' });
      findOne.mockReset().mockResolvedValue(null);
      Object.assign(mockDataSource, { getRepository: jest.fn(() => ({ findOne })) });
    });

    it.each([{ groupId: 'grupo-ajeno' }, { billsId: 'factura-ajena' }])(
      'no crea un gasto que apunte a %p',
      async (reference) => {
        await expect(service.addPlan({ ...dto, ...reference } as never, 'user-1')).rejects.toThrow(
          NotFoundException,
        );
        expect(findOne).toHaveBeenCalledTimes(1);
      },
    );
  });

  // ─── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('throws BadRequestException when budgetId is missing', async () => {
      await expect(service.findAll({} as never, 'u-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.findAll({ budgetId: 'b-1' } as never, 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns all expenses for the budget', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.findAll.mockResolvedValue([makeExpense()]);

      const result = await service.findAll({ budgetId: 'budget-1' } as never, 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── createUnplannedExpense ────────────────────────────────────────────────
  describe('createUnplannedExpense', () => {
    const baseData = {
      userId: 'user-1',
      amount: 30000,
      categoryId: 'cat-1',
      budgetId: 'budget-1',
      date: new Date(),
    };

    it('throws NotFoundException when budget not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when budget is not ACTIVE', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ status: 'PLANNED' }));
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when amount is negative', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      await expect(service.createUnplannedExpense({ ...baseData, amount: -1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when category not found', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue(null);
      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(NotFoundException);
    });

    it('creates transaction and returns it', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockManager.save.mockResolvedValue({ id: 'tx-1', amount: 30000 });

      const result = await service.createUnplannedExpense(baseData);
      expect(result.transaction.id).toBe('tx-1');
    });

    it('bloquea el presupuesto y rechaza el gasto si supera el saldo disponible', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockTransactionRepo.getBudgetTotals.mockResolvedValue({
        income: 100000,
        expense: 60000,
        savings: 20000,
      });

      await expect(service.createUnplannedExpense(baseData)).rejects.toThrow(
        /Saldo insuficiente: tu saldo disponible es \$20\.000,00\./,
      );
      expect(mockManager.query).toHaveBeenCalledWith(expect.stringContaining('FOR NO KEY UPDATE'), [
        'budget-1',
      ]);
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('uses trimmed description as source when provided', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      await service.createUnplannedExpense({ ...baseData, description: '  Taxi  ' });
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ source: 'Taxi', description: 'Taxi' }),
      );
    });

    it('uses default source when description is not provided', async () => {
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      await service.createUnplannedExpense(baseData);
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ source: 'Gasto no planificado' }),
      );
    });
  });

  // ─── updatePlannedExpense ──────────────────────────────────────────────────
  describe('updatePlannedExpense', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(service.updatePlannedExpense('e-1', 'u-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when budget not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.updatePlannedExpense('e-1', 'u-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.updatePlannedExpense('e-1', 'u-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when update returns null', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.update.mockResolvedValue(null);
      await expect(
        service.updatePlannedExpense('e-1', 'user-1', { name: 'Nuevo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ignores budgetId and status in the update data', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      const updated = makeExpense({ name: 'Actualizado' });
      mockExpenseRepo.update.mockResolvedValue(updated);

      await service.updatePlannedExpense('exp-1', 'user-1', {
        name: 'Actualizado',
        budgetId: 'other-budget',
        status: PlannedExpenseStatus.PAID,
      });

      const updateCallArg = mockExpenseRepo.update.mock.calls[0][1];
      expect(updateCallArg.budgetId).toBeUndefined();
      expect(updateCallArg.status).toBeUndefined();
      expect(updateCallArg.name).toBe('Actualizado');
    });

    it('rechaza subir el monto de un gasto planificado por encima de lo que queda por planificar', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ expectedAmount: 50000 }));
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      plannedTotals(1000000, 800000, 100000); // sin contar este gasto quedan 100.000

      await expect(
        service.updatePlannedExpense('exp-1', 'user-1', { expectedAmount: 300000 }),
      ).rejects.toThrow(/supera lo que te queda por planificar: \$100\.000,00/);
      expect(mockExpenseRepo.update).not.toHaveBeenCalled();
    });

    it('permite bajar el monto de un gasto planificado sin validar los ingresos', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ expectedAmount: 50000 }));
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.update.mockResolvedValue(makeExpense({ expectedAmount: 20000 }));

      await service.updatePlannedExpense('exp-1', 'user-1', { expectedAmount: 20000 });

      expect(mockQuery.getRawOne).not.toHaveBeenCalled();
      expect(mockExpenseRepo.update).toHaveBeenCalledTimes(1);
    });

    it('returns updated expense', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.update.mockResolvedValue(makeExpense({ name: 'Actualizado' }));

      const result = await service.updatePlannedExpense('exp-1', 'user-1', { name: 'Actualizado' });
      expect(result.name).toBe('Actualizado');
    });
  });

  // ─── completePlannedExpense ────────────────────────────────────────────────
  describe('completePlannedExpense', () => {
    const arrange = () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ expectedAmount: 50000 }));
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockCategoryRepo.findById.mockResolvedValue({ id: 'cat-1' });
      mockAccountRepo.findPrimaryByUserId.mockResolvedValue({ id: 'acc-1' });
      mockManager.findOne.mockResolvedValue(makeExpense({ status: PlannedExpenseStatus.PAID }));
    };

    it('paga el gasto y registra la transacción con el presupuesto bloqueado', async () => {
      arrange();

      const result = await service.completePlannedExpense('exp-1', 'user-1');

      expect(mockManager.query).toHaveBeenCalledWith(expect.stringContaining('FOR NO KEY UPDATE'), [
        'budget-1',
      ]);
      expect(result.plannedExpense.status).toBe(PlannedExpenseStatus.PAID);
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ amount: 50000, type: 'expense' }),
      );
    });

    it('no paga el gasto si supera el saldo disponible', async () => {
      arrange();
      mockTransactionRepo.getBudgetTotals.mockResolvedValue({
        income: 100000,
        expense: 60000,
        savings: 20000,
      });

      await expect(service.completePlannedExpense('exp-1', 'user-1')).rejects.toThrow(
        /Saldo insuficiente: tu saldo disponible es \$20\.000,00\./,
      );
      expect(mockManager.save).not.toHaveBeenCalled();
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  // ─── cancelPlannedExpense ──────────────────────────────────────────────────
  describe('cancelPlannedExpense', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(service.cancelPlannedExpense('e-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(null);
      await expect(service.cancelPlannedExpense('e-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when budget belongs to another user', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget({ ownerId: 'other' }));
      await expect(service.cancelPlannedExpense('e-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when expense is already PAID', async () => {
      mockExpenseRepo.findById.mockResolvedValue(
        makeExpense({ status: PlannedExpenseStatus.PAID }),
      );
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      await expect(service.cancelPlannedExpense('e-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when expense is already CANCELED', async () => {
      mockExpenseRepo.findById.mockResolvedValue(
        makeExpense({ status: PlannedExpenseStatus.CANCELED }),
      );
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      await expect(service.cancelPlannedExpense('e-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancels and returns the expense', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockBudgetRepo.findById.mockResolvedValue(makeBudget());
      mockExpenseRepo.cancel.mockResolvedValue(
        makeExpense({ status: PlannedExpenseStatus.CANCELED }),
      );

      const result = await service.cancelPlannedExpense('exp-1', 'user-1');
      expect(result.status).toBe(PlannedExpenseStatus.CANCELED);
    });
  });
});
