import { Controller, Get } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { CategoriesService } from '../../application/services/categories.service';

@Controller('categories')
export class CategoriesController {
  private readonly context: string = CategoriesController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly categoriesService: CategoriesService,
  ) {}
  @Get('/')
  async getCategories() {
    this.logger.log(this.context, 'Getting categories');
    return await this.categoriesService.getCategories();
  }
}
