import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { LoggerProviderService } from '@/core/providers';

import { CategoriesService } from '../../application/services/categories.service';

@ApiTags('categories')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('categories')
export class CategoriesController {
  private readonly context: string = CategoriesController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get('/')
  @ApiOperation({ summary: 'Obtener todas las categorías disponibles' })
  @ApiOkResponse({ description: 'Lista de categorías' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'No autorizado')
  async getCategories() {
    this.logger.log(this.context, 'Getting categories');
    return await this.categoriesService.getCategories();
  }
}
