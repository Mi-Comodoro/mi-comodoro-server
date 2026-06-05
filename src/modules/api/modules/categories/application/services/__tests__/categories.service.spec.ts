import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { Category, CategoryBucket, CategoryType } from '../../../domain/category';
import { CategoriesService } from '../categories.service';

const mockCategoryRepository = {
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

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Alimentación',
  type: CategoryType.EXPENSE,
  bucket: CategoryBucket.NEEDS,
  isSelectable: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  nulledAt: null,
  ...overrides,
});

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: 'CategoryRepository', useValue: mockCategoryRepository },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('returns all categories from the repository', async () => {
      const expected = [makeCategory(), makeCategory({ id: 'cat-2', name: 'Transporte' })];
      mockCategoryRepository.findAll.mockResolvedValue(expected);

      const result = await service.getCategories();

      expect(mockCategoryRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });

    it('returns an empty array when no categories exist', async () => {
      mockCategoryRepository.findAll.mockResolvedValue([]);
      const result = await service.getCategories();
      expect(result).toEqual([]);
    });
  });

  describe('createCategory', () => {
    it('creates a category and returns the saved entity', async () => {
      const dto = {
        name: 'Transporte',
        type: 'expense' as const,
        bucket: 'needs' as const,
        isSelectable: true,
      };
      const saved = makeCategory({ name: 'Transporte' });
      mockCategoryRepository.save.mockResolvedValue(saved);

      const result = await service.createCategory(dto);

      expect(mockCategoryRepository.save).toHaveBeenCalledWith({
        name: 'Transporte',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.NEEDS,
        isSelectable: true,
        parentId: undefined,
      });
      expect(result).toEqual(saved);
    });

    it('defaults isSelectable to true when not provided', async () => {
      const dto = { name: 'Otros', type: 'expense' as const };
      mockCategoryRepository.save.mockResolvedValue(makeCategory({ name: 'Otros' }));

      await service.createCategory(dto);

      expect(mockCategoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isSelectable: true }),
      );
    });

    it('passes parentId when provided in the dto', async () => {
      const dto = { name: 'Sub-categoría', type: 'expense' as const, parentId: 'parent-id' };
      mockCategoryRepository.save.mockResolvedValue(makeCategory());

      await service.createCategory(dto);

      expect(mockCategoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'parent-id' }),
      );
    });
  });

  describe('updateCategory', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.updateCategory('missing-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates only the name field when provided', async () => {
      const existing = makeCategory();
      mockCategoryRepository.findById.mockResolvedValue(existing);
      mockCategoryRepository.save.mockResolvedValue({ ...existing, name: 'Comida' });

      const result = await service.updateCategory('cat-1', { name: 'Comida' });

      expect(mockCategoryRepository.save).toHaveBeenCalledWith({ ...existing, name: 'Comida' });
      expect(result.name).toBe('Comida');
    });

    it('merges partial updates without affecting untouched fields', async () => {
      const existing = makeCategory({ bucket: CategoryBucket.NEEDS });
      mockCategoryRepository.findById.mockResolvedValue(existing);
      const updated = { ...existing, type: CategoryType.SAVINGS };
      mockCategoryRepository.save.mockResolvedValue(updated);

      await service.updateCategory('cat-1', { type: 'savings' });

      expect(mockCategoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: CategoryBucket.NEEDS, type: CategoryType.SAVINGS }),
      );
    });
  });

  describe('deleteCategory', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.deleteCategory('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('calls softDelete with the category id', async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockCategoryRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteCategory('cat-1');

      expect(mockCategoryRepository.softDelete).toHaveBeenCalledWith('cat-1');
    });

    it('does not call softDelete when category is not found', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.deleteCategory('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockCategoryRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
