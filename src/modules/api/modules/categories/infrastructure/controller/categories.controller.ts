import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

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
  @UseGuards(AuthGuard('jwt'))
  async getCategories() {
    this.logger.log(this.context, 'Getting categories');
    return await this.categoriesService.getCategories();
  }
}
