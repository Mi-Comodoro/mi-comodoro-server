import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PlanEntity } from '../../database/plan.entity';
import { PlanRepositoryImpl } from '../plan.repository.impl';

const mockRepo = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const makePlanEntity = (overrides = {}) => ({
  id: 'plan-1',
  name: 'Free',
  description: 'Plan gratuito',
  price: '0',
  isPublic: true,
  nulledAt: null,
  ...overrides,
});

describe('PlanRepositoryImpl', () => {
  let repository: PlanRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanRepositoryImpl,
        { provide: getRepositoryToken(PlanEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<PlanRepositoryImpl>(PlanRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('saves plan and returns domain object', async () => {
      mockRepo.save.mockResolvedValue(makePlanEntity());
      const result = await repository.save({ name: 'Free' } as never);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ name: 'Free' });
    });

    it('sets id on entity when provided', async () => {
      mockRepo.save.mockResolvedValue(makePlanEntity({ id: 'existing-id' }));
      await repository.save({ id: 'existing-id', name: 'Free' } as never);
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing-id' }));
    });
  });

  describe('findAll', () => {
    it('returns all non-deleted plans', async () => {
      mockRepo.find.mockResolvedValue([
        makePlanEntity(),
        makePlanEntity({ id: 'plan-2', name: 'Pro' }),
      ]);
      const result = await repository.findAll();
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no plans', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findPublic', () => {
    it('returns only public plans', async () => {
      mockRepo.find.mockResolvedValue([makePlanEntity()]);
      const result = await repository.findPublic();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns plan when found', async () => {
      mockRepo.findOne.mockResolvedValue(makePlanEntity());
      const result = await repository.findById('plan-1');
      expect(result).toMatchObject({ id: 'plan-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark plan as deleted', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('plan-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'plan-1' },
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });
});
