import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

import { PlannedExpense } from '../../domain/expenses';
type STATUS_ENUM = 'PLANNED' | 'ACTIVE' | 'CANCELLED' | 'SKIPPED';
export class CreateExpensePlanDto implements PlannedExpense {
  @IsString()
  @IsOptional()
  @ApiProperty({
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
    nullable: true,
  })
  budgetId: string;
  @IsString()
  @ApiProperty({
    type: 'string',
    example: 'PLANNED',
    required: true,
  })
  status: STATUS_ENUM;

  @ApiProperty({ type: 'string', example: 'Arriendo', required: true })
  @IsString()
  name: string;
  @IsNumber()
  @ApiProperty({ type: 'number', example: 5000000, required: true })
  expectedAmount: number;

  @ApiProperty({ type: 'string', example: '2f20b698-2eaf-4b75-bfbc-758b727ee8a8', required: true })
  @IsString()
  categoryId: string;

  // @IsDate()
  @IsString()
  @ApiProperty({ type: 'string', example: '2026-03-16T07:07:12.34Z', required: true })
  dueDate: Date;
  @IsBoolean()
  @ApiProperty({ type: 'boolean', example: true })
  isEssential: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: 'string',
    example: 'Se paga el mes con mora, siempre queda un pago pendiente',
  })
  notes?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: 'string',
    example: 'ba0929a1-1c29-4859-9c7f-c999db23d535',
    required: false,
    nullable: true,
  })
  billsId?: string;
}
