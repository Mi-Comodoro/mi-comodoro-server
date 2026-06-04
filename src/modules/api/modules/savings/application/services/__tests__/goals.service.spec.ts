import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { GoalStatus } from '../../../domain/savings-goals';
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
};

const mockCategoryRepo = {
  findByType: jest.fn(),
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
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    jest.clearAllMocks();
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
      contributionType: 'external' as const,
    };

    it('lanza NotFoundException si el goal no existe', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(null);
      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si contributionType=internal y no hay accountId', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      await expect(
        service.createContribution('goal-1', 'user-1', {
          amount: 200,
          date: '2026-06-01',
          contributionType: 'internal',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si contributionType=internal y la cuenta no pertenece al usuario', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockAccountRepo.get.mockResolvedValue([{ id: 'otra-cuenta' }]);
      await expect(
        service.createContribution('goal-1', 'user-1', {
          amount: 200,
          date: '2026-06-01',
          contributionType: 'internal',
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

    it('lanza NotFoundException si no hay budget para el mes actual', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'fin-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue(null);
      await expect(
        service.createContribution('goal-1', 'user-1', baseDto as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea plannedSaving con status COMPLETED en contribución external exitosa', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'fin-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockPlannedSavingRepo.save.mockResolvedValue({ id: 'ps-1', amount: 200 });
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-savings' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });

      const result = await service.createContribution('goal-1', 'user-1', baseDto as never);
      expect(mockPlannedSavingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          savingGoalId: 'goal-1',
          budgetId: 'budget-1',
          amount: 200,
        }),
      );
      expect(result.id).toBe('ps-1');
    });

    it('acepta contribución internal si la cuenta existe en las cuentas del usuario', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockAccountRepo.get.mockResolvedValue([{ id: 'acc-valid' }]);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'fin-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockPlannedSavingRepo.save.mockResolvedValue({ id: 'ps-2', amount: 100 });
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-savings' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-2' });

      const result = await service.createContribution('goal-1', 'user-1', {
        amount: 100,
        date: '2026-06-01',
        contributionType: 'internal',
        accountId: 'acc-valid',
      } as never);
      expect(result.id).toBe('ps-2');
    });

    it('no bloquea el flujo si la creación de transacción falla', async () => {
      mockGoalsRepo.findByIdAndUser.mockResolvedValue(baseGoal);
      mockFinancesRepo.findByUserId.mockResolvedValue({ id: 'fin-1' });
      mockBudgetRepo.findByFinancesIdAndMonth.mockResolvedValue({ id: 'budget-1' });
      mockPlannedSavingRepo.save.mockResolvedValue({ id: 'ps-1', amount: 200 });
      mockCategoryRepo.findByType.mockResolvedValue({ id: 'cat-savings' });
      mockTransactionRepo.save.mockRejectedValue(new Error('TX error'));

      const result = await service.createContribution('goal-1', 'user-1', baseDto as never);
      expect(result.id).toBe('ps-1');
      expect(mockLogger.warn).toHaveBeenCalled();
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
