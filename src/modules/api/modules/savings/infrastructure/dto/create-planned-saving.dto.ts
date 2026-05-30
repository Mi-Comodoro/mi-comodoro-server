import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePlannedSavingDto {
  @ApiProperty({ description: 'Monto a ahorrar', minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'UUID del presupuesto activo' })
  @IsUUID()
  budgetId: string;

  @ApiPropertyOptional({ description: 'UUID del ingreso planeado al que se vincula' })
  @IsOptional()
  @IsUUID()
  plannedIncomeId?: string;

  @ApiPropertyOptional({ description: 'UUID de la meta de ahorro destino' })
  @IsOptional()
  @IsUUID()
  savingGoalId?: string;
}
