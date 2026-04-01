import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { GoalsService } from '../../application/services/goals.service';
import { SavingsGoalsCreateDto } from '../dto/savings-goals.dto';

@Controller('goals')
export class GoalsController {
  private readonly context: string = GoalsController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly goalsService: GoalsService,
  ) {}
  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  async create(@CurrentUser() user: JwtPayload, @Body() body: SavingsGoalsCreateDto) {
    this.logger.info(this.context, 'creating savings goals');
    const data = { ...body, userId: user.userId };
    return await this.goalsService.create(data);
  }

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  async find(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'getting savings goals');
    return await this.goalsService.find(user.userId);
  }
}
