import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { GoalsService } from '../../application/services/goals.service';
import { SavingsGoalsCreateDto } from '../dto/savings-goals.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';

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
}
