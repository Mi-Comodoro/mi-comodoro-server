import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { TravelExpenseAssignmentEntity } from '../../database/entities/travel-expense-assignment.entity';
import { TravelExpenseAssignmentRepositoryImpl } from '../travel-expense-assignment.repository.impl';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

describe('TravelExpenseAssignmentRepositoryImpl', () => {
  let repository: TravelExpenseAssignmentRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelExpenseAssignmentRepositoryImpl,
        { provide: getRepositoryToken(TravelExpenseAssignmentEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<TravelExpenseAssignmentRepositoryImpl>(
      TravelExpenseAssignmentRepositoryImpl,
    );
    jest.clearAllMocks();
  });

  describe('saveMany', () => {
    it('creates entities, saves and converts assignedAmount to Number', async () => {
      const assignments = [
        { expenseId: 'exp-1', userId: 'user-1', assignedAmount: '500' },
        { expenseId: 'exp-1', userId: 'user-2', assignedAmount: '300' },
      ];
      mockRepo.create.mockReturnValue(assignments);
      mockRepo.save.mockResolvedValue(assignments);

      const result = await repository.saveMany([
        { expenseId: 'exp-1', userId: 'user-1', assignedAmount: 500 } as never,
        { expenseId: 'exp-1', userId: 'user-2', assignedAmount: 300 } as never,
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].assignedAmount).toBe(500);
    });
  });

  describe('findByExpense', () => {
    it('returns assignments for expense with amount as Number', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 'a-1', expenseId: 'exp-1', userId: 'user-1', assignedAmount: '250.50' },
      ]);
      const result = await repository.findByExpense('exp-1');
      expect(result).toHaveLength(1);
      expect(result[0].assignedAmount).toBe(250.5);
    });

    it('returns empty array when no assignments', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findByExpense('exp-1');
      expect(result).toEqual([]);
    });
  });

  describe('findByExpenseAndUser', () => {
    it('returns assignment when found', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'a-1',
        expenseId: 'exp-1',
        userId: 'user-1',
        assignedAmount: '100',
      });
      const result = await repository.findByExpenseAndUser('exp-1', 'user-1');
      expect(result).not.toBeNull();
      expect(result?.assignedAmount).toBe(100);
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByExpenseAndUser('exp-1', 'user-99');
      expect(result).toBeNull();
    });
  });

  describe('deleteByExpense', () => {
    it('soft-deletes all assignments for the expense', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.deleteByExpense('exp-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { expenseId: 'exp-1' },
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });

  describe('settle', () => {
    it('marks assignment as settled', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.settle('a-1');
      expect(mockRepo.update).toHaveBeenCalledWith('a-1', { settled: true });
    });
  });
});
