import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

import { PlannedSavingService } from '../../application/services/planned-saving.service';

@Controller('planned-savings')
export class PlannedSavingController {
  constructor(private readonly plannedSavingService: PlannedSavingService) {}

  @Get('budget/:budgetId')
  async findByBudget(@Param('budgetId') budgetId: string) {
    return this.plannedSavingService.findByBudget(budgetId);
  }

  @Patch(':id')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  async savingDone(@Param('id') id: string) {
    return await this.plannedSavingService.markAsDone(id);
  }
}
