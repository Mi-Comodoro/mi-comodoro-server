import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CategoryType } from '../../../domain/category';
import { CategoryEntity } from '../../database/category.entity';
import { CategoryRepositoryImpl } from '../category.repository.impl';

const mockRepo = {
  save: jest.fn(),
  count: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

const makeCategoryEntity = (overrides = {}) => ({
  id: 'cat-1',
  name: 'Alimentación',
  type: CategoryType.EXPENSE,
  isSelectable: false,
  nulledAt: null,
  ...overrides,
});

describe('CategoryRepositoryImpl', () => {
  let repository: CategoryRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRepositoryImpl,
        { provide: getRepositoryToken(CategoryEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<CategoryRepositoryImpl>(CategoryRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('maps to entity, saves and returns', async () => {
      mockRepo.save.mockResolvedValue(makeCategoryEntity());
      const result = await repository.save({
        name: 'Alimentación',
        type: CategoryType.EXPENSE,
      } as never);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ name: 'Alimentación' });
    });
  });

  describe('count', () => {
    it('returns category count', async () => {
      mockRepo.count.mockResolvedValue(10);
      const result = await repository.count();
      expect(result).toBe(10);
    });
  });

  describe('findAll', () => {
    it('returns all non-deleted categories', async () => {
      mockRepo.find.mockResolvedValue([
        makeCategoryEntity(),
        makeCategoryEntity({ id: 'cat-2', name: 'Transporte' }),
      ]);
      const result = await repository.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns category when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeCategoryEntity());
      const result = await repository.findById('cat-1');
      expect(result).toMatchObject({ id: 'cat-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    it('returns category by type when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeCategoryEntity({ type: CategoryType.INCOME }));
      const result = await repository.findByType(CategoryType.INCOME);
      expect(result).not.toBeNull();
    });

    it('returns null when category type not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByType(CategoryType.INCOME);
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('calls repo.delete with the given id', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      await repository.delete('cat-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark category as deleted', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('cat-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'cat-1' },
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });
});
