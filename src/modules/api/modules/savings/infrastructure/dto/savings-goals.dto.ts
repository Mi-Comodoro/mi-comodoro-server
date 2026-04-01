import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsString, Min, MinDate } from 'class-validator';

import { SavingGoal } from '../../domain/savings-goals';

export class SavingsGoalsCreateDto implements SavingGoal {
  @ApiProperty({ example: 'Mi Casa Nueva', description: 'Nombre personalizado de la meta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Vivienda (Compra/Reforma)',
    description: 'Motivo del ahorro (basado en la lista predefinida)',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 5000, description: 'Monto total que se desea alcanzar' })
  @IsNumber()
  @Min(1)
  targetAmount: number;

  @ApiProperty({ example: '2025-12-31', description: 'Fecha objetivo para cumplir la meta' })
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date())
  targetDate: Date;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ example: 'uuid-de-la-cuenta' })
  @IsString()
  accountId: string;
}
