import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { Category, CategoryBucket, CategoryType } from '../../domain/category';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { CreateCategoryDto } from '../../infrastructure/dto/create-category.dto';
import { UpdateCategoryDto } from '../../infrastructure/dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly context: string = CategoriesService.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('CategoryRepository') private readonly categoriesRepository: CategoryRepository,
  ) {}

  async getCategories() {
    this.logger.log(this.context, 'Getting categories');
    return await this.categoriesRepository.findAll();
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    this.logger.log(this.context, 'Creating category');
    return await this.categoriesRepository.save({
      name: dto.name,
      type: dto.type as CategoryType,
      bucket: dto.bucket as CategoryBucket | undefined,
      isSelectable: dto.isSelectable ?? true,
      parentId: dto.parentId,
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    this.logger.log(this.context, `Updating category ${id}`);
    const existing = await this.categoriesRepository.findById(id);
    if (!existing) throw new NotFoundException(`Category ${id} not found`);
    return await this.categoriesRepository.save({
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type as CategoryType }),
      ...(dto.bucket !== undefined && { bucket: dto.bucket as CategoryBucket }),
      ...(dto.isSelectable !== undefined && { isSelectable: dto.isSelectable }),
    });
  }

  async deleteCategory(id: string): Promise<void> {
    this.logger.log(this.context, `Deleting category ${id}`);
    const existing = await this.categoriesRepository.findById(id);
    if (!existing) throw new NotFoundException(`Category ${id} not found`);
    await this.categoriesRepository.softDelete(id);
  }
}
