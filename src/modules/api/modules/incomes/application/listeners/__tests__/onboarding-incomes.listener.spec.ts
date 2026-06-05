import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingIncomesListener } from '../onboarding-incomes.listener';

const mockIncomeSourceRepo = { bulkCreate: jest.fn() };
const mockPlannedIncomeRepo = { generateIncomesPlannedForBudget: jest.fn() };
const mockEventEmitter = { emitAsync: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makePayload = (overrides = {}) => ({
  userId: 'user-1',
  data: {
    incomes: [
      {
        amount: 3000000,
        source: 'Salario',
        frequency: 'monthly',
        paymentDays: [15],
        isActive: true,
      },
    ],
    finances: {},
  },
  budget: { id: 'budget-1', year: 2026, month: 'junio' },
  ...overrides,
});

describe('OnboardingIncomesListener', () => {
  let listener: OnboardingIncomesListener;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingIncomesListener,
        { provide: 'IncomesRepository', useValue: mockIncomeSourceRepo },
        { provide: 'PlannedIncomeRepository', useValue: mockPlannedIncomeRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<OnboardingIncomesListener>(OnboardingIncomesListener);
    jest.clearAllMocks();
    mockEventEmitter.emitAsync.mockResolvedValue(undefined);
  });

  it('creates income sources and planned incomes for budget', async () => {
    const createdIncomes = [{ id: 'inc-1', source: 'Salario', amount: 3000000 }];
    mockIncomeSourceRepo.bulkCreate.mockResolvedValue(createdIncomes);
    mockPlannedIncomeRepo.generateIncomesPlannedForBudget.mockResolvedValue(undefined);

    await listener.setupIncomes(makePayload() as never);

    expect(mockIncomeSourceRepo.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
          source: 'Salario',
          amount: 3000000,
          frequency: 'monthly',
        }),
      ]),
    );
    expect(mockPlannedIncomeRepo.generateIncomesPlannedForBudget).toHaveBeenCalledWith(
      'budget-1',
      createdIncomes,
      2026,
      5, // junio → index 5
    );
  });

  it('emits onboarding.completed after creating incomes', async () => {
    mockIncomeSourceRepo.bulkCreate.mockResolvedValue([{ id: 'inc-1' }]);
    mockPlannedIncomeRepo.generateIncomesPlannedForBudget.mockResolvedValue(undefined);

    await listener.setupIncomes(makePayload() as never);

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith('onboarding.completed', {
      userId: 'user-1',
    });
  });

  it('warns and skips planned income creation when payload has no incomes', async () => {
    mockIncomeSourceRepo.bulkCreate.mockResolvedValue([]);

    await listener.setupIncomes(makePayload({ data: { incomes: [], finances: {} } }) as never);

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockPlannedIncomeRepo.generateIncomesPlannedForBudget).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalledWith(
      'onboarding.completed',
      expect.anything(),
    );
  });

  it('defaults income frequency to monthly when not provided', async () => {
    const payload = makePayload({
      data: {
        incomes: [{ amount: 1000, source: 'Freelance', paymentDays: [], isActive: true }],
        finances: {},
      },
    });
    mockIncomeSourceRepo.bulkCreate.mockResolvedValue([{ id: 'inc-1' }]);
    mockPlannedIncomeRepo.generateIncomesPlannedForBudget.mockResolvedValue(undefined);

    await listener.setupIncomes(payload as never);

    expect(mockIncomeSourceRepo.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ frequency: 'monthly' })]),
    );
  });

  it('emits onboarding.rollback and does not throw on error', async () => {
    mockIncomeSourceRepo.bulkCreate.mockRejectedValue(new Error('DB error'));

    await expect(listener.setupIncomes(makePayload() as never)).resolves.toBeUndefined();

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      'onboarding.rollback',
      expect.objectContaining({ userId: 'user-1', step: 'incomes' }),
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
