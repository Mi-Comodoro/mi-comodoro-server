import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { PlannedExpenseStatus } from '../../domain/expenses';

export class CreateExpensePlanDto {
  @ApiProperty({ example: 'uuid' })
  @IsNotEmpty()
  budgetId: string;

  @ApiProperty({ example: 'uuid' })
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Arriendo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 950000 })
  @IsNumber()
  @Min(0)
  expectedAmount: number;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ enum: PlannedExpenseStatus, example: PlannedExpenseStatus.PLANNED })
  @IsEnum(PlannedExpenseStatus)
  status: PlannedExpenseStatus;

  @ApiProperty({ example: true })
  @IsBoolean()
  isEssential: boolean;

  @ApiProperty({ required: false, example: 'Pago mensual' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false, example: 'uuid' })
  @IsOptional()
  billsId?: string;
}
export class CreateUnplannedExpenseDto {
  @ApiProperty({ example: 950000, description: 'Monto del gasto no planificado' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
    description: 'UUID de la categoria del gasto',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    required: false,
    example: 'Compra imprevista',
    description: 'Descripcion opcional del gasto no planificado',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
    description: 'UUID del presupuesto activo',
  })
  @IsUUID()
  budgetId: string;

  @ApiProperty({
    example: '2026-04-15T00:00:00.000Z',
    description: 'Fecha real del gasto no planificado',
  })
  @IsDateString()
  date: string;
}

export class UpdateExpenseDto {
  @ApiProperty({ example: 'Arriendo actualizado', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 1000000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  expectedAmount?: number;

  @ApiProperty({ example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6', required: false })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: '2026-05-15', required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ example: 'Pago mensual actualizado', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
