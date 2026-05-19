import { Category, CategoryBucket, CategoryType } from '../../domain/category';
import { CategoryEntity } from '../database/category.entity';

export class CategoryMapper {
  static toDomain(entity: CategoryEntity): Category {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      isSelectable: entity.isSelectable,
      bucket: entity.bucket,
      parentId: entity.parentId,
      children: entity.children ? entity.children.map((child) => this.toDomain(child)) : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      nulledAt: entity.nulledAt ?? null,
    };
  }

  static toEntity(domain: Category): CategoryEntity {
    const entity = new CategoryEntity();

    entity.id = domain.id;
    entity.name = domain.name;
    entity.type = domain.type as CategoryType;
    entity.isSelectable = domain.isSelectable;
    entity.bucket = domain.bucket as CategoryBucket;
    entity.parentId = domain.parentId;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.nulledAt = domain.nulledAt ?? null;

    return entity;
  }
}
