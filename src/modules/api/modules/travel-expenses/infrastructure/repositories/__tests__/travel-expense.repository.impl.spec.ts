import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { TravelExpenseEntity } from '../../database/entities/travel-expense.entity';
import { TravelExpenseRepositoryImpl } from '../travel-expense.repository.impl';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
};

describe('TravelExpenseRepositoryImpl', () => {
  let repository: TravelExpenseRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelExpenseRepositoryImpl,
        { provide: getRepositoryToken(TravelExpenseEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<TravelExpenseRepositoryImpl>(TravelExpenseRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('creates entity, saves and converts amount to Number', async () => {
      const expense = { groupId: 'g1', paidBy: 'user-1', amount: 1000 };
      mockRepo.create.mockReturnValue(expense);
      mockRepo.save.mockResolvedValue({ id: 'te-1', ...expense, amount: '1000' });

      const result = await repository.save(expense as never);

      expect(result.amount).toBe(1000);
      expect(typeof result.amount).toBe('number');
    });
  });

  describe('findById', () => {
    it('returns expense with amount as Number when found', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'te-1',
        amount: '750.50',
        groupId: 'g1',
        nulledAt: null,
      });
      const result = await repository.findById('te-1');
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(750.5);
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findByGroup', () => {
    it('returns expenses for group with amount converted', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 'te-1', amount: '500', groupId: 'g1' },
        { id: 'te-2', amount: '300', groupId: 'g1' },
      ]);
      const result = await repository.findByGroup('g1');
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(500);
      expect(result[1].amount).toBe(300);
    });

    it('returns empty array when no expenses', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findByGroup('g1');
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('calls repo.update with id and data', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.update('te-1', { description: 'Nuevo' } as never);
      expect(mockRepo.update).toHaveBeenCalledWith('te-1', { description: 'Nuevo' });
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark expense as deleted', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('te-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'te-1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });
});
