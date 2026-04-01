import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { CategoryRepository } from '../../domain/repositories/category.repository';

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
}
