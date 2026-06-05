import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { GroupExpenseEntity } from '../../database/entities/group-expense.entity';
import { GroupExpenseRepositoryImpl } from '../group-expense.repository.impl';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  findOneOrFail: jest.fn(),
};

const makeEntity = (overrides = {}) => ({
  id: 'exp-1',
  groupId: 'group-1',
  description: 'Cena',
  amount: '1000',
  dueDate: new Date('2026-06-01'),
  responsibleUserId: 'user-1',
  status: 'pending',
  transactionId: null,
  cxpId: null,
  cxcId: null,
  nulledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('GroupExpenseRepositoryImpl', () => {
  let repository: GroupExpenseRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupExpenseRepositoryImpl,
        { provide: getRepositoryToken(GroupExpenseEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<GroupExpenseRepositoryImpl>(GroupExpenseRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findByGroup', () => {
    it('returns mapped expenses for group', async () => {
      mockRepo.find.mockResolvedValue([makeEntity()]);
      const result = await repository.findByGroup('group-1');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(1000); // converted to Number
    });

    it('returns empty array when no expenses', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findByGroup('group-1');
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns mapped expense when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeEntity());
      const result = await repository.findById('exp-1');
      expect(result).toMatchObject({ id: 'exp-1', amount: 1000 });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('creates entity, saves, and returns domain object', async () => {
      const expense = { groupId: 'group-1', description: 'Cena', amount: 1000 };
      mockRepo.create.mockReturnValue(makeEntity());
      mockRepo.save.mockResolvedValue(makeEntity());

      const result = await repository.save(expense as never);

      expect(result.amount).toBe(1000);
    });
  });

  describe('update', () => {
    it('updates expense and returns updated domain object', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findOneOrFail.mockResolvedValue(makeEntity({ description: 'Actualizado' }));

      const result = await repository.update('exp-1', { description: 'Actualizado' });

      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      expect(result.description).toBe('Actualizado');
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns updated domain object', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findOneOrFail.mockResolvedValue(makeEntity({ status: 'paid' }));

      const result = await repository.updateStatus('exp-1', 'paid' as never);

      expect(mockRepo.update).toHaveBeenCalledWith('exp-1', { status: 'paid' });
      expect(result.status).toBe('paid');
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark expense as deleted', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('exp-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'exp-1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });
});
