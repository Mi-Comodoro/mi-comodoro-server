import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { PlansService } from '../plans.service';

const mockRepo = {
  findPublic: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makePlan = (overrides = {}) => ({
  id: 'plan-1',
  name: 'Basic',
  price: 0,
  currency: 'COP',
  features: ['feature1'],
  isActive: true,
  isPublic: true,
  ...overrides,
});

describe('PlansService', () => {
  let service: PlansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'PlanRepository', useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    jest.clearAllMocks();
  });

  // ─── getPublicPlans ────────────────────────────────────────────────────────
  describe('getPublicPlans', () => {
    it('returns public plans', async () => {
      mockRepo.findPublic.mockResolvedValue([makePlan()]);
      const result = await service.getPublicPlans();
      expect(mockRepo.findPublic).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  // ─── getAllPlans ───────────────────────────────────────────────────────────
  describe('getAllPlans', () => {
    it('returns all plans', async () => {
      mockRepo.findAll.mockResolvedValue([makePlan(), makePlan({ id: 'plan-2' })]);
      const result = await service.getAllPlans();
      expect(result).toHaveLength(2);
    });
  });

  // ─── createPlan ───────────────────────────────────────────────────────────
  describe('createPlan', () => {
    it('saves plan with defaults and returns result', async () => {
      const dto = { name: 'Pro' };
      mockRepo.save.mockResolvedValue(makePlan({ name: 'Pro' }));

      const result = await service.createPlan(dto as never);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pro',
          price: 0,
          currency: 'COP',
          isActive: true,
          isPublic: true,
        }),
      );
      expect(result.name).toBe('Pro');
    });
  });

  // ─── updatePlan ───────────────────────────────────────────────────────────
  describe('updatePlan', () => {
    it('throws NotFoundException when plan not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.updatePlan('plan-1', {})).rejects.toThrow(NotFoundException);
    });

    it('merges changes and returns updated plan', async () => {
      const existing = makePlan();
      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(makePlan({ name: 'Pro Updated' }));

      const result = await service.updatePlan('plan-1', { name: 'Pro Updated' } as never);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'plan-1', name: 'Pro Updated' }),
      );
      expect(result.name).toBe('Pro Updated');
    });
  });

  // ─── deletePlan ───────────────────────────────────────────────────────────
  describe('deletePlan', () => {
    it('throws NotFoundException when plan not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.deletePlan('plan-1')).rejects.toThrow(NotFoundException);
    });

    it('soft deletes plan', async () => {
      mockRepo.findById.mockResolvedValue(makePlan());
      mockRepo.softDelete.mockResolvedValue(undefined);

      await service.deletePlan('plan-1');

      expect(mockRepo.softDelete).toHaveBeenCalledWith('plan-1');
    });
  });
});
