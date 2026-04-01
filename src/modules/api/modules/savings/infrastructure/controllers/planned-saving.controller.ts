import { Controller, Get, Param } from '@nestjs/common';

import { PlannedSavingService } from '../../application/services/planned-saving.service';

@Controller('planned-savings')
export class PlannedSavingController {
  constructor(private readonly plannedSavingService: PlannedSavingService) {}

  @Get('budget/:budgetId')
  async findByBudget(@Param('budgetId') budgetId: string) {
    return this.plannedSavingService.findByBudget(budgetId);
  }
}
