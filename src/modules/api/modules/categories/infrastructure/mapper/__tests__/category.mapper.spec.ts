import { CategoryBucket, CategoryType } from '../../../domain/category';
import { CategoryEntity } from '../../database/category.entity';
import { CategoryMapper } from '../category.mapper';

const makeEntity = (overrides: Partial<CategoryEntity> = {}): CategoryEntity => {
  const e = new CategoryEntity();
  e.id = 'cat-1';
  e.name = 'Alimentación';
  e.type = CategoryType.EXPENSE;
  e.bucket = CategoryBucket.NEEDS;
  e.isSelectable = true;
  e.parentId = undefined;
  e.children = [];
  e.createdAt = new Date('2024-01-01T00:00:00Z');
  e.updatedAt = new Date('2024-06-01T00:00:00Z');
  e.nulledAt = null;
  return Object.assign(e, overrides);
};

describe('CategoryMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const entity = makeEntity();
      const domain = CategoryMapper.toDomain(entity);

      expect(domain.id).toBe('cat-1');
      expect(domain.name).toBe('Alimentación');
      expect(domain.type).toBe(CategoryType.EXPENSE);
      expect(domain.bucket).toBe(CategoryBucket.NEEDS);
      expect(domain.isSelectable).toBe(true);
      expect(domain.parentId).toBeUndefined();
      expect(domain.nulledAt).toBeNull();
    });

    it('maps children recursively', () => {
      const child = makeEntity({ id: 'cat-child', name: 'Restaurantes', children: [] });
      const entity = makeEntity({ children: [child] });

      const domain = CategoryMapper.toDomain(entity);

      expect(domain.children).toHaveLength(1);
      expect(domain.children![0].id).toBe('cat-child');
      expect(domain.children![0].name).toBe('Restaurantes');
    });

    it('returns undefined children when entity has no children', () => {
      const entity = makeEntity({ children: undefined as unknown as CategoryEntity[] });
      const domain = CategoryMapper.toDomain(entity);
      expect(domain.children).toBeUndefined();
    });

    it('maps nulledAt when it has a value', () => {
      const nulledDate = new Date('2024-05-01');
      const entity = makeEntity({ nulledAt: nulledDate });
      const domain = CategoryMapper.toDomain(entity);
      expect(domain.nulledAt).toEqual(nulledDate);
    });

    it('maps parentId when present', () => {
      const entity = makeEntity({ parentId: 'parent-uuid' });
      const domain = CategoryMapper.toDomain(entity);
      expect(domain.parentId).toBe('parent-uuid');
    });
  });

  describe('toEntity', () => {
    it('maps all domain fields onto the entity', () => {
      const domain = {
        id: 'cat-2',
        name: 'Transporte',
        type: CategoryType.EXPENSE,
        bucket: CategoryBucket.WANTS,
        isSelectable: false,
        parentId: 'parent-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
        nulledAt: null,
      };

      const entity = CategoryMapper.toEntity(domain);

      expect(entity).toBeInstanceOf(CategoryEntity);
      expect(entity.id).toBe('cat-2');
      expect(entity.name).toBe('Transporte');
      expect(entity.type).toBe(CategoryType.EXPENSE);
      expect(entity.bucket).toBe(CategoryBucket.WANTS);
      expect(entity.isSelectable).toBe(false);
      expect(entity.parentId).toBe('parent-1');
      expect(entity.nulledAt).toBeNull();
    });

    it('maps nulledAt from domain to entity', () => {
      const date = new Date('2024-03-15');
      const domain = {
        id: 'cat-3',
        name: 'Otros',
        type: CategoryType.EXPENSE,
        isSelectable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        nulledAt: date,
      };

      const entity = CategoryMapper.toEntity(domain);
      expect(entity.nulledAt).toEqual(date);
    });
  });
});
