import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { AdminGuard } from '@/common/guards/admin.guard';
import { LoggerProviderService } from '@/core/providers';

import { CategoriesService } from '../../application/services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

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

  @Post('/')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Crear una nueva categoría (admin)' })
  @ApiOkResponse({ description: 'Categoría creada' })
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Acceso denegado')
  async createCategory(@Body() dto: CreateCategoryDto) {
    this.logger.log(this.context, 'Creating category');
    return await this.categoriesService.createCategory(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Actualizar una categoría (admin)' })
  @ApiOkResponse({ description: 'Categoría actualizada' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Categoría no encontrada')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Acceso denegado')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    this.logger.log(this.context, `Updating category ${id}`);
    return await this.categoriesService.updateCategory(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una categoría (soft delete, admin)' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Categoría no encontrada')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Acceso denegado')
  async deleteCategory(@Param('id') id: string) {
    this.logger.log(this.context, `Deleting category ${id}`);
    await this.categoriesService.deleteCategory(id);
  }
}
