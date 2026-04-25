import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinDate,
  ValidateIf,
} from 'class-validator';

import { GoalStatus, SavingGoal } from '../../domain/savings-goals';

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

  @ApiProperty({ example: 5000, description: 'Monto total (opcional)', required: false })
  @ValidateIf((o) => o.targetAmount !== undefined && o.targetAmount !== null)
  @IsNumber()
  @Min(1)
  targetAmount?: number;

  @ApiProperty({ example: '2025-12-31', description: 'Fecha objetivo (opcional)', required: false })
  @ValidateIf((o) => o.targetDate !== undefined && o.targetDate !== null)
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date())
  targetDate?: Date;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ enum: GoalStatus, default: GoalStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @ApiProperty({ example: 'uuid-de-la-cuenta' })
  @IsString()
  accountId: string;
}
