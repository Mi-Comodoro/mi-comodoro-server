import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePlannedSavingDto {
  @ApiProperty({ description: 'Monto a ahorrar', minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'UUID del presupuesto activo' })
  @IsUUID()
  budgetId: string;

  @ApiProperty({ description: 'UUID del ingreso planeado al que se vincula' })
  @IsUUID()
  plannedIncomeId: string;

  @ApiProperty({ description: 'UUID de la meta de ahorro destino' })
  @IsUUID()
  savingGoalId: string;
}
