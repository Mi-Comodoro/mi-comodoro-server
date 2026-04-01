import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Max, Min } from 'class-validator';

import { SavingAllocation } from '../../domain/savings-allocations';

export class SavingsAllocationCreateDto implements SavingAllocation {
  @ApiProperty({
    description: 'ID del objetivo de ahorro',
    example: 'a3f5c6e2-1234-4bcd-9abc-1234567890ab',
  })
  @IsString()
  goalId: string;

  @ApiProperty({
    description: 'Porcentaje asignado al objetivo',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({
    description: 'ID del presupuesto',
    example: 'b7d9e8f1-5678-4cde-8def-0987654321cd',
  })
  @IsString()
  budgetId: string;
}
