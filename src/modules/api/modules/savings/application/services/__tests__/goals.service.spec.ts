import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { GoalStatus } from '../../../domain/savings-goals';
import { PlannedSavingStatus } from '../../../domain/savings-planned';
import { GoalsService } from '../goals.service';

const mockGoalsRepo = {
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUser: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockHistoryRepo = {
  findByGoalId: jest.fn(),
  add: jest.fn(),
};

const mockPlannedSavingRepo = {
  sumCompletedByGoalIds: jest.fn(),
  findByGoalId: jest.fn(),
  findByBudget: jest.fn().mockResolvedValue([]),
  update: jest.fn(),
  save: jest.fn(),
};

const mockAccountRepo = {
  get: jest.fn(),
};

const mockBudgetRepo = {
  findByFinancesIdAndMonth: jest.fn(),
};

const mockFinancesRepo = {
  findByUserId: jest.fn(),
};

const mockTransactionRepo = {
  findByGoalId: jest.fn(),
  getGoalSummary: jest.fn(),
  save: jest.fn(),
  getBudgetTotals: jest.fn(),
};

const mockCategoryRepo = {
  findByType: jest.fn(),
};

const mockManager = {
  query: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(async (callback: (manager: typeof mockManager) => unknown) =>
    callback(mockManager),
  ),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const baseGoal = {
  id: 'goal-1',
  name: 'Viaje',
  reason: 'Vacaciones',
  isActive: true,
  status: GoalStatus.SCHEDULED,
  userId: 'user-1',
  accountId: 'acc-1',
};

describe('GoalsService', () => {
  let service: GoalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: 'GoalsRepository', useValue: mockGoalsRepo },
        { provide: 'GoalHistoryRepository', useValue: mockHistoryRepo },
        { provide: 'PlannedSavingRepository', useValue: mockPlannedSavingRepo },
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: 'BudgetRepository', useValue: mockBudgetRepo },
        { provide: 'FinancesRepository', useValue: mockFinancesRepo },
        { provide: 'TransactionRepository', useValue: mockTransactionRepo },
        { provide: 'CategoryRepository', useValue: mockCategoryRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    jest.clearAllMocks();
    // Por defecto el manager devuelve lo que se le pasa a save, como lo haría TypeORM
    mockManager.save.mockImplementation(async (a: unknown, b?: object) => b ?? a);
    mockManager.find.mockResolvedValue([]);
    mockTransactionRepo.getBudgetTotals.mockResolvedValue({
      income: 1000000,
      expense: 0,
      savings: 0,
    });
  });

  describe('create', () => {
    it('llama goalsRepository.create con los datos recibidos', async () => {
      mockGoalsRepo.create.mockResolvedValue(baseGoal);
      const result = await service.create(baseGoal as never);
      expect(mockGoalsRepo.create).toHaveBeenCalledWith(baseGoal);
      expect(result).toEqual(baseGoal);
    });

    it('propaga error si goalsRepository.create falla', async () => {
      mockGoalsRepo.create.mockRejectedValue(new Error('DB error'));
      await expect(service.create(baseGoal as never)).rejects.toThrow('DB error');
    });
  });

  describe('find', () => {
    it('retorna array vacío si no hay goals', async () => {
      mockGoalsRepo.find.mockResolvedValue([]);
      const result = await service.find('user-1');
      expect(result).toEqual([]);
      expect(mockPlannedSavingRepo.sumCompletedByGoalIds).not.toHaveBeenCalled();
    });

    it('combina goals con totalSaved desde plannedSavings', async () => {
      mockGoalsRepo.find.mockResolvedValue([baseGoal]);
      mockPlannedSavingRepo.sumCompletedByGoalIds.mockResolvedValue([
        { goalId: 'goal-1', total: 500 },
      ]);
      const result = await service.find('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].totalSaved).toBe(500);
    });

    it('asigna totalSaved = 0 si el goal no aparece en los totales', async () => {
      mockGoalsRepo.find.mockResolvedValue([baseGoal]);
      mockPlannedSavingRepo.sumCompletedByGoalIds.mockResolvedValue([]);
      const result = await service.find('user-1');
      expect(result[0].totalSaved).toBe(0);
    });

    it('llama sumCompletedByGoalIds con los ids correctos', async () => {
      mockGoalsRepo.find.mockResolvedValue([baseGoal, { ...baseGoal, id: 'goal-2' }]);
      mockPlannedSavingRepo.sumCompletedByGoalIds.mockResolvedValue([]);
      await service.find('user-1');
      expect(mockPlannedSavingRepo.sumCompletedByGoalIds).toHaveBeenCalledWith([
        'goal-1',
        'goal-2',
      ]);
    });
  });

  describe('findById', () => {
    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(service.findById('goal-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna el goal con plannedSavings', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([{ id: 'ps-1' }]);
      const result = await service.findById('goal-1', 'user-1');
      expect(result.id).toBe('goal-1');
      expect(result.plannedSavings).toHaveLength(1);
    });

    it('llama findByIdAndUser con los parámetros correctos', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockPlannedSavingRepo.findByGoalId.mockResolvedValue([]);
      await service.findById('goal-1', 'user-1');
      expect(mockGoalsRepo.findByIdAndUser).toHaveBeenCalledWith('goal-1', 'user-1');
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(service.update('goal-1', 'user-1', { name: 'Nuevo' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si accountId cambia y la cuenta no pertenece al usuario', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockAccountRepo.get.mockResolvedValue([{ id: 'otro-acc' }]);
      await expect(
        service.update('goal-1', 'user-1', { accountId: 'acc-nueva' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('NO valida accountId si no cambia respecto al existente', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, name: 'Actualizado' });
      await service.update('goal-1', 'user-1', { accountId: 'acc-1' } as never);
      expect(mockAccountRepo.get).not.toHaveBeenCalled();
    });

    it('actualiza el goal correctamente y retorna el resultado', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, name: 'Nuevo nombre' });
      const result = await service.update('goal-1', 'user-1', { name: 'Nuevo nombre' } as never);
      expect(result.name).toBe('Nuevo nombre');
    });

    it('lanza NotFoundException si goalsRepository.update retorna null', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue(null);
      await expect(service.update('goal-1', 'user-1', { name: 'X' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('valida accountId si cambia y lo acepta cuando existe en las cuentas del usuario', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockAccountRepo.get.mockResolvedValue([{ id: 'acc-nueva' }]);
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, accountId: 'acc-nueva' });
      const result = await service.update('goal-1', 'user-1', { accountId: 'acc-nueva' } as never);
      expect(result.accountId).toBe('acc-nueva');
    });
  });

  describe('deleteGoal', () => {
    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findById.mockResolvedValue(null);
      await expect(service.deleteGoal('goal-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza UnauthorizedException si el goal no pertenece al usuario', async () => {
      mockGoalsRepo.findById.mockResolvedValue({ ...baseGoal, userId: 'otro-user' });
      await expect(service.deleteGoal('goal-1', 'user-1')).rejects.toThrow(UnauthorizedException);
    });

    it('elimina el goal y retorna { success: true }', async () => {
      mockGoalsRepo.findById.mockResolvedValue(baseGoal);
      mockGoalsRepo.delete.mockResolvedValue(undefined);
      const result = await service.deleteGoal('goal-1', 'user-1');
      expect(mockGoalsRepo.delete).toHaveBeenCalledWith('goal-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateStatus', () => {
    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(
        service.updateStatus('goal-1', 'user-1', { status: GoalStatus.IN_PROGRESS }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException para transición inválida COMPLETED → IN_PROGRESS', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({
        ...baseGoal,
        status: GoalStatus.COMPLETED,
      });
      await expect(
        service.updateStatus('goal-1', 'user-1', { status: GoalStatus.IN_PROGRESS }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException para transición inválida IN_PROGRESS → SCHEDULED', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({
        ...baseGoal,
        status: GoalStatus.IN_PROGRESS,
      });
      await expect(
        service.updateStatus('goal-1', 'user-1', { status: GoalStatus.SCHEDULED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite transición SCHEDULED → IN_PROGRESS', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, status: GoalStatus.IN_PROGRESS });
      const result = await service.updateStatus('goal-1', 'user-1', {
        status: GoalStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(GoalStatus.IN_PROGRESS);
    });

    it('permite transición SCHEDULED → PAUSED', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, status: GoalStatus.PAUSED });
      const result = await service.updateStatus('goal-1', 'user-1', { status: GoalStatus.PAUSED });
      expect(result.status).toBe(GoalStatus.PAUSED);
    });

    it('permite transición IN_PROGRESS → COMPLETED', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({
        ...baseGoal,
        status: GoalStatus.IN_PROGRESS,
      });
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, status: GoalStatus.COMPLETED });
      const result = await service.updateStatus('goal-1', 'user-1', {
        status: GoalStatus.COMPLETED,
      });
      expect(result.status).toBe(GoalStatus.COMPLETED);
    });

    it('permite transición PAUSED → IN_PROGRESS', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({
        ...baseGoal,
        status: GoalStatus.PAUSED,
      });
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, status: GoalStatus.IN_PROGRESS });
      const result = await service.updateStatus('goal-1', 'user-1', {
        status: GoalStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(GoalStatus.IN_PROGRESS);
    });

    it('permite transición PAUSED → SCHEDULED', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({
        ...baseGoal,
        status: GoalStatus.PAUSED,
      });
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, status: GoalStatus.SCHEDULED });
      const result = await service.updateStatus('goal-1', 'user-1', {
        status: GoalStatus.SCHEDULED,
      });
      expect(result.status).toBe(GoalStatus.SCHEDULED);
    });

    it('usa SCHEDULED como estado por defecto si el goal no tiene status definido', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({ ...baseGoal, status: undefined });
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue({ ...baseGoal, status: GoalStatus.IN_PROGRESS });
      const result = await service.updateStatus('goal-1', 'user-1', {
        status: GoalStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(GoalStatus.IN_PROGRESS);
    });

    it('lanza NotFoundException si goalsRepository.update retorna null', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockHistoryRepo.add.mockResolvedValue(undefined);
      mockGoalsRepo.update.mockResolvedValue(null);
      await expect(
        service.updateStatus('goal-1', 'user-1', { status: GoalStatus.IN_PROGRESS }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHistory', () => {
    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findById.mockResolvedValue(null);
      await expect(service.getHistory('goal-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza UnauthorizedException si el goal no pertenece al usuario', async () => {
      mockGoalsRepo.findById.mockResolvedValue({ ...baseGoal, userId: 'otro-user' });
      await expect(service.getHistory('goal-1', 'user-1')).rejects.toThrow(UnauthorizedException);
    });

    it('retorna el historial del goal', async () => {
      mockGoalsRepo.findById.mockResolvedValue(baseGoal);
      mockHistoryRepo.findByGoalId.mockResolvedValue([{ id: 'hist-1', field: 'name' }]);
      const result = await service.getHistory('goal-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'hist-1' });
    });
  });

  describe('createContribution', () => {
    const baseDto = {
      amount: 200,
      date: '2026-06-01',
      accountId: 'acc-1',
    };

    // Arma el escenario feliz: meta, cuenta, presupuesto, categoría y planes pendientes
    const arrange = (opts: { goal?: object; plans?: unknown[] } = {}) => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(opts.goal ?? baseGoal);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'fin-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-savings' });
      mockManager.find.mockResolvedValue(opts.plans ?? []);
    };

    // El plan se guarda con save(entidad), el resto con save(Clase, datos)
    const savedPlan = () => mockManager.save.mock.calls.find((c) => c.length === 1)?.[0];

    beforeEach(() => {
      mockAccountRepo.get.mockResolvedValue([{ id: 'acc-1' }]);
    });

    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si no hay cuenta de origen ni la meta tiene cuenta', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue({ ...baseGoal, accountId: undefined });
      await expect(
        service.createContribution('goal-1', 'user-1', {
          amount: 200,
          date: '2026-06-01',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si la cuenta de origen no pertenece al usuario', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockAccountRepo.get.mockResolvedValue([{ id: 'otra-cuenta' }]);
      await expect(
        service.createContribution('goal-1', 'user-1', {
          amount: 200,
          date: '2026-06-01',
          accountId: 'acc-no-existe',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si finances no encontrado', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockFinancesRepo.findByUserId.mockResolvedValue(null);
      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si finances.id es undefined', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockFinancesRepo.findByUserId.mockResolvedValue({});
      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si no hay budget para el mes del aporte', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'fin-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue(null);
      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('falla sin abrir la transacción si no existe la categoría de ahorro', async () => {
      arrange();
      mockCategoryRepo.findByType.mockResolvedValue(null);
      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(NotFoundException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('crea el plan COMPLETED y la transacción de ahorro dentro de una sola transacción', async () => {
      arrange();

      const result = await service.createContribution('goal-1', 'user-1', baseDto as never);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(savedPlan()).toEqual(
        expect.objectContaining({ amount: 200, status: PlannedSavingStatus.COMPLETED }),
      );
      const savingsTx = mockManager.save.mock.calls.find((c) => c[1]?.type === 'savings');
      expect(savingsTx?.[1]).toEqual(
        expect.objectContaining({ budgetId: 'budget-1', amount: 200, savingGoalId: 'goal-1' }),
      );
      expect(result.amount).toBe(200);
      // El aporte ya no pasa por los repositorios: todo ocurre con el manager de la transacción
      expect(mockPlannedSavingRepo.save).not.toHaveBeenCalled();
      expect(mockTransactionRepo.save).not.toHaveBeenCalled();
    });

    it('bloquea la fila del presupuesto antes de leer el saldo', async () => {
      arrange();

      await service.createContribution('goal-1', 'user-1', baseDto as never);

      expect(mockManager.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), [
        'budget-1',
      ]);
      expect(mockTransactionRepo.getBudgetTotals).toHaveBeenCalledWith('budget-1', mockManager);
      expect(mockManager.query.mock.invocationCallOrder[0]).toBeLessThan(
        mockTransactionRepo.getBudgetTotals.mock.invocationCallOrder[0],
      );
    });

    it('si falla la transacción de ahorro el aporte falla completo (hace rollback)', async () => {
      arrange({ goal: { ...baseGoal, status: GoalStatus.SCHEDULED } });
      mockManager.save.mockImplementation(async (a: unknown, b?: { type?: string }) => {
        if (b?.type === 'savings') throw new Error('TX error');
        return b ?? a;
      });

      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow('TX error');
      // La meta no llega a activarse: el error corta el resto de pasos
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('pasa la meta de SCHEDULED a IN_PROGRESS con el primer aporte y deja historial', async () => {
      arrange({ goal: { ...baseGoal, status: GoalStatus.SCHEDULED } });

      await service.createContribution('goal-1', 'user-1', baseDto as never);

      expect(mockManager.update).toHaveBeenCalledWith(
        expect.anything(),
        { id: 'goal-1', userId: 'user-1' },
        { status: GoalStatus.IN_PROGRESS },
      );
      const history = mockManager.save.mock.calls.find((c) => c[1]?.field === 'status');
      expect(history?.[1]).toEqual(
        expect.objectContaining({
          oldValue: GoalStatus.SCHEDULED,
          newValue: GoalStatus.IN_PROGRESS,
        }),
      );
    });

    it('no cambia el estado si la meta ya está en progreso', async () => {
      arrange({ goal: { ...baseGoal, status: GoalStatus.IN_PROGRESS } });

      await service.createContribution('goal-1', 'user-1', baseDto as never);

      expect(mockManager.update).not.toHaveBeenCalled();
    });

    describe('ahorro planificado pendiente de la meta', () => {
      it('completa el plan pendiente cuando el aporte lo cubre y no crea uno nuevo', async () => {
        arrange({
          goal: { ...baseGoal, status: GoalStatus.IN_PROGRESS },
          plans: [{ id: 'plan-1', amount: '150.00', date: '2026-06-10' }],
        });

        const result = await service.createContribution('goal-1', 'user-1', baseDto as never);

        expect(savedPlan()).toEqual(
          expect.objectContaining({
            id: 'plan-1',
            status: PlannedSavingStatus.COMPLETED,
            amount: 200,
          }),
        );
        expect(mockManager.update).not.toHaveBeenCalled();
        expect(result.id).toBe('plan-1');
      });

      it('un aporte parcial completa una fila y deja el plan pendiente solo por el resto', async () => {
        arrange({
          goal: { ...baseGoal, status: GoalStatus.IN_PROGRESS },
          plans: [{ id: 'plan-1', amount: '500.00', date: '2026-06-10' }],
        });

        await service.createContribution('goal-1', 'user-1', baseDto as never);

        expect(savedPlan().id).toBeUndefined();
        expect(mockManager.update).toHaveBeenCalledTimes(1);
        expect(mockManager.update).toHaveBeenCalledWith(expect.anything(), 'plan-1', {
          amount: 300,
        });
      });

      it('sin plan pendiente crea una fila nueva y no actualiza ninguna', async () => {
        arrange({ goal: { ...baseGoal, status: GoalStatus.IN_PROGRESS }, plans: [] });

        await service.createContribution('goal-1', 'user-1', baseDto as never);

        expect(mockManager.update).not.toHaveBeenCalled();
      });
    });

    it('sin cuenta indicada el aporte usa la cuenta de la meta', async () => {
      arrange();

      await service.createContribution('goal-1', 'user-1', {
        amount: 200,
        date: '2026-06-01',
      } as never);

      expect(savedPlan().account?.id).toBe('acc-1');
    });

    it('rechaza el aporte si el presupuesto no tiene ingresos', async () => {
      arrange();
      mockTransactionRepo.getBudgetTotals.mockResolvedValue({ income: 0, expense: 0, savings: 0 });

      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow('Aún no has registrado ingresos en este presupuesto.');
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('rechaza el aporte si supera el saldo disponible', async () => {
      arrange();
      mockTransactionRepo.getBudgetTotals.mockResolvedValue({
        income: 1000,
        expense: 500,
        savings: 400,
      });

      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(/Saldo insuficiente: tu saldo disponible es \$100,00\./);
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('un aporte no registra ingresos: sale del Disponible del presupuesto', async () => {
      arrange();

      await service.createContribution('goal-1', 'user-1', baseDto as never);

      const types = mockManager.save.mock.calls.map((c) => c[1]?.type).filter(Boolean);
      expect(types).toEqual(['savings']);
    });

    it('busca el presupuesto del mes de la fecha del aporte, no el del mes en curso', async () => {
      arrange();

      await service.createContribution('goal-1', 'user-1', {
        ...baseDto,
        date: '2026-03-15T10:00:00.000Z',
      } as never);

      expect(mockBudgetRepo.findByFinancesIdAndMonth).toHaveBeenCalledWith('fin-1', 'Marzo', 2026);
    });

    it('acepta el aporte si la cuenta existe en las cuentas del usuario', async () => {
      arrange();
      mockAccountRepo.get.mockResolvedValue([{ id: 'acc-valid' }]);

      const result = await service.createContribution('goal-1', 'user-1', {
        amount: 100,
        date: '2026-06-01',
        accountId: 'acc-valid',
      } as never);
      expect(result.amount).toBe(100);
    });
  });

  describe('getGoalContributions', () => {
    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findById.mockResolvedValue(null);
      await expect(service.getGoalContributions('goal-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza UnauthorizedException si el goal no pertenece al usuario', async () => {
      mockGoalsRepo.findById.mockResolvedValue({ ...baseGoal, userId: 'otro-user' });
      await expect(service.getGoalContributions('goal-1', 'user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('retorna las transacciones del goal', async () => {
      mockGoalsRepo.findById.mockResolvedValue(baseGoal);
      mockTransactionRepo.findByGoalId.mockResolvedValue([{ id: 'tx-1' }]);
      const result = await service.getGoalContributions('goal-1', 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getGoalSummary', () => {
    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findById.mockResolvedValue(null);
      await expect(service.getGoalSummary('goal-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza UnauthorizedException si el goal no pertenece al usuario', async () => {
      mockGoalsRepo.findById.mockResolvedValue({ ...baseGoal, userId: 'otro-user' });
      await expect(service.getGoalSummary('goal-1', 'user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('retorna el summary del goal llamando transactionRepository.getGoalSummary', async () => {
      const summary = { totalSaved: 1000, totalTransactions: 5 };
      mockGoalsRepo.findById.mockResolvedValue(baseGoal);
      mockTransactionRepo.getGoalSummary.mockResolvedValue(summary);
      const result = await service.getGoalSummary('goal-1', 'user-1');
      expect(mockTransactionRepo.getGoalSummary).toHaveBeenCalledWith(
        'goal-1',
        'user-1',
        baseGoal.accountId,
        baseGoal.name,
      );
      expect(result).toEqual(summary);
    });
  });
});
