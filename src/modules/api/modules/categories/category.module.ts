import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategorySeederService } from './application/seed/categories.seed';
import { CategoriesService } from './application/services/categories.service';
import { CategoriesController } from './infrastructure/controller/categories.controller';
import { CategoryEntity } from './infrastructure/database/category.entity';
import { CategoryRepositoryImpl } from './infrastructure/repositories/category.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  controllers: [CategoriesController],
  providers: [
    CategorySeederService,
    CategoriesService,
    {
      provide: 'CategoryRepository',
      useClass: CategoryRepositoryImpl,
    },
  ],
  exports: [CategorySeederService, 'CategoryRepository'],
})
export class CategoryModule {}
