import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingAccountListener } from '../onboarding-account.listener';

const mockAccountRepo = {
  findPrimaryByUserId: jest.fn(),
  add: jest.fn(),
};
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
    finances: {
      accountName: 'Cuenta Principal',
      interestRate: 3.5,
    },
    incomes: [],
  },
  ...overrides,
});

describe('OnboardingAccountListener', () => {
  let listener: OnboardingAccountListener;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingAccountListener,
        { provide: 'AccountRepository', useValue: mockAccountRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<OnboardingAccountListener>(OnboardingAccountListener);
    jest.clearAllMocks();
  });

  it('creates primary account when none exists', async () => {
    mockAccountRepo.findPrimaryByUserId.mockResolvedValue(null);
    mockAccountRepo.add.mockResolvedValue(undefined);

    await listener.setupPrimaryAccount(makePayload() as never);

    expect(mockAccountRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cuenta Principal',
        type: 'bank',
        isPrimary: true,
        userId: 'user-1',
        interestRate: 3.5,
        compoundingFrequency: 'monthly',
        isActive: true,
      }),
    );
  });

  it('skips account creation when primary account already exists', async () => {
    mockAccountRepo.findPrimaryByUserId.mockResolvedValue({ id: 'existing-acc' });

    await listener.setupPrimaryAccount(makePayload() as never);

    expect(mockAccountRepo.add).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('logs error and does not throw when an exception occurs', async () => {
    mockAccountRepo.findPrimaryByUserId.mockRejectedValue(new Error('DB error'));

    await expect(listener.setupPrimaryAccount(makePayload() as never)).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalled();
  });
});
