import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category, CategoryType } from '../../domain/category';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryEntity } from '../database/category.entity';
import { CategoryMapper } from '../mapper/category.mapper';

@Injectable()
export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  async save(category: Partial<Category>): Promise<Category> {
    const categoryEntity = CategoryMapper.toEntity(category as Category);

    const savedCategory = await this.categoryRepo.save(categoryEntity);
    return savedCategory;
  }

  async count(): Promise<number> {
    return await this.categoryRepo.count();
  }

  async findAll(): Promise<Category[]> {
    const categoryEntities = await this.categoryRepo.find({ where: { nulledAt: null } });
    return categoryEntities.map((entity) => CategoryMapper.toDomain(entity));
  }

  async findById(id: string): Promise<Category | null> {
    const categoryEntity = await this.categoryRepo.findOne({ where: { id } });
    if (!categoryEntity) {
      return null;
    }
    return CategoryMapper.toDomain(categoryEntity);
  }

  async findByType(type: CategoryType): Promise<Category | null> {
    const entity = await this.categoryRepo.findOne({
      where: { type, isSelectable: false }, // categoría raíz, no subcategoría
    });

    if (!entity) return null;
    return CategoryMapper.toDomain(entity);
  }
  async delete(id: string): Promise<void> {
    await this.categoryRepo.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.categoryRepo.update({ id }, { nulledAt: new Date() });
  }
}
