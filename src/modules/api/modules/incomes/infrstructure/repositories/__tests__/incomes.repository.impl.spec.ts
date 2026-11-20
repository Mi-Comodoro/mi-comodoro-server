import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { IncomesEntity } from '../../database/entities/incomes.entity';
import { IncomesRepositoryImpl } from '../incomes.repository.impl';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const makeIncomeEntity = (overrides = {}) => ({
  id: 'inc-1',
  userId: 'user-1',
  source: 'Salario',
  amount: '15000',
  paymentDays: [1, 15],
  isActive: true,
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('IncomesRepositoryImpl', () => {
  let repository: IncomesRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomesRepositoryImpl,
        { provide: getRepositoryToken(IncomesEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<IncomesRepositoryImpl>(IncomesRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('bulkCreate', () => {
    it('creates and saves multiple incomes', async () => {
      const entities = [makeIncomeEntity(), makeIncomeEntity({ id: 'inc-2' })];
      mockRepo.create.mockReturnValue(entities);
      mockRepo.save.mockResolvedValue(entities);
      const result = await repository.bulkCreate([
        { userId: 'user-1', source: 'Salario', amount: 15000 } as never,
      ]);
      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('saves single income and returns it', async () => {
      const entity = makeIncomeEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      const result = await repository.create({
        userId: 'user-1',
        source: 'Salario',
        amount: 15000,
      } as never);
      expect(result).toMatchObject({ id: 'inc-1' });
    });
  });

  describe('findAll', () => {
    it('returns all income sources', async () => {
      mockRepo.find.mockResolvedValue([makeIncomeEntity()]);
      const result = await repository.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns income when found', async () => {
      mockRepo.findOneBy.mockResolvedValue(makeIncomeEntity());
      const result = await repository.findById('inc-1');
      expect(result).toMatchObject({ id: 'inc-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findCurrentMonthIncomes', () => {
    it('returns aggregated incomes for the month', async () => {
      mockRepo.find.mockResolvedValue([
        makeIncomeEntity({ source: 'Salario', amount: '15000', paymentDays: [1] }),
      ]);
      const result = await repository.findCurrentMonthIncomes('user-1', 1, 2026);
      expect(result.expectedIncomes).toHaveLength(1);
      expect(result.totalExpectedIncomes).toBe(15000);
      expect(result.expectedIncomes[0].source).toBe('Salario');
    });

    it('returns empty results when no incomes', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findCurrentMonthIncomes('user-1', 1, 2026);
      expect(result.expectedIncomes).toHaveLength(0);
      expect(result.totalExpectedIncomes).toBe(0);
    });
  });

  describe('update', () => {
    it('updates income and returns updated entity', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findOneBy.mockResolvedValue(makeIncomeEntity({ source: 'Salario Actualizado' }));
      const result = await repository.update('inc-1', { source: 'Salario Actualizado' } as never);
      expect(result).toMatchObject({ source: 'Salario Actualizado' });
    });
  });

  describe('delete', () => {
    it('deletes income and returns true', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      const result = await repository.delete('inc-1');
      expect(result).toBe(true);
    });
  });
});
