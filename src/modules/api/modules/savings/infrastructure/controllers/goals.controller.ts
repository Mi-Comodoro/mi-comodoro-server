import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { GoalsService } from '../../application/services/goals.service';
import { SavingsGoalsCreateDto } from '../dto/savings-goals.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import { UpdateGoalStatusDto } from '../dto/update-goal-status.dto';

@ApiTags('Savings Goals')
@Controller('goals')
export class GoalsController {
  private readonly context: string = GoalsController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly goalsService: GoalsService,
  ) {}
  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Crear una meta de ahorro' })
  @ApiOkResponse({ description: 'Meta de ahorro creada exitosamente' })
  async create(@CurrentUser() user: JwtPayload, @Body() body: SavingsGoalsCreateDto) {
    this.logger.info(this.context, 'creating savings goals');
    const data = { ...body, userId: user.userId };
    return await this.goalsService.create(data);
  }

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener todas las metas de ahorro del usuario' })
  @ApiOkResponse({ description: 'Lista de metas de ahorro' })
  async find(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'getting savings goals');
    return await this.goalsService.find(user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener una meta por ID' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la meta' })
  @ApiOkResponse({ description: 'Meta de ahorro' })
  async findById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'getting saving goal by id');
    return await this.goalsService.findById(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar una meta de ahorro' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la meta' })
  @ApiOkResponse({ description: 'Meta actualizada exitosamente' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, 'updating savings goal');
    return await this.goalsService.update(id, user.userId, dto);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update goal status with transition validation' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la meta' })
  @ApiOkResponse({ description: 'Status actualizado exitosamente' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateGoalStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, 'updating savings goal status');
    return await this.goalsService.updateStatus(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Delete a saving goal' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la meta' })
  @ApiOkResponse({ description: 'Goal deleted successfully' })
  async deleteGoal(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    this.logger.info(this.context, 'deleting savings goal');
    return await this.goalsService.deleteGoal(id, user.userId);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get change history for a saving goal' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la meta' })
  @ApiOkResponse({ description: 'History retrieved successfully' })
  async getHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'getting savings goal history');
    return await this.goalsService.getHistory(id, user.userId);
  }
}
