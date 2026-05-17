import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import type { SplitType } from '../../domain/travel-expense';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'uuid-usuario', description: 'UUID del usuario asignado' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 25000, description: 'Monto asignado al usuario' })
  @IsNumber()
  @Min(0)
  assignedAmount: number;
}

export class CreateTravelExpenseDto {
  @ApiProperty({ example: 'uuid-grupo', description: 'UUID del grupo' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ example: 'Cena en restaurante', description: 'Descripción del gasto' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 120000, description: 'Monto total del gasto' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-05-16', description: 'Fecha del gasto (ISO 8601)' })
  @IsDateString()
  expenseDate: string;

  @ApiProperty({
    enum: ['EQUAL', 'CUSTOM', 'PERCENTAGE'],
    example: 'EQUAL',
    description: 'Tipo de división del gasto',
  })
  @IsEnum(['EQUAL', 'CUSTOM', 'PERCENTAGE'])
  splitType: SplitType;

  @ApiPropertyOptional({
    type: [CreateAssignmentDto],
    description: 'Asignaciones manuales (requerido para CUSTOM y PERCENTAGE)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssignmentDto)
  assignments?: CreateAssignmentDto[];
}

export class UpdateTravelExpenseDto {
  @ApiPropertyOptional({ example: 'Nueva descripción' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-05-17' })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}

export class SettleAssignmentDto {
  @ApiProperty({ example: 'uuid-usuario', description: 'UUID del usuario a marcar como saldado' })
  @IsUUID()
  userId: string;
}
