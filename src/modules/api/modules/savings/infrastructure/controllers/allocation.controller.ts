import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { LoggerProviderService } from '@/core/providers';

import { SavingAllocationService } from '../../application/services/allocations.service';
import { SavingsAllocationCreateDto } from '../dto/savings-allocation.dto';

@Controller('allocations')
export class SavingAllocationController {
  private readonly context: string = SavingAllocationController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly savingAllocationService: SavingAllocationService,
  ) {}
  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: SavingsAllocationCreateDto) {
    this.logger.info(this.context, 'creating savings goals');
    const data = { ...body };
    return await this.savingAllocationService.create(data);
  }

  @Get('/:budgetId')
  @UseGuards(AuthGuard('jwt'))
  async find(@Param('budgedId') budgetId: string) {
    this.logger.info(this.context, 'getting savings goals');
    return await this.savingAllocationService.find(budgetId);
  }
}
