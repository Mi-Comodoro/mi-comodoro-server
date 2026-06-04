import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

import { Budget } from '../../domain/budget';

class BudgetResponseData implements Budget {
  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'a1d959d0-9260-4e62-adb5-8a615b95e819',
  })
  id: string;

  @ApiResponseProperty({ type: 'string', example: 'Presupuesto marzo' })
  name: string;

  @ApiResponseProperty({ type: 'string', example: 'marzo' })
  month: string;

  @ApiResponseProperty({ type: 'number', example: 2026 })
  year: number;

  @ApiResponseProperty({ type: 'boolean', example: false })
  isShared: boolean;

  @ApiResponseProperty({ type: 'number', example: 50 })
  needsLimit: number;

  @ApiResponseProperty({ type: 'number', example: 30 })
  wantsLimit: number;

  @ApiResponseProperty({ type: 'number', example: 20 })
  savingsLimit: number;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'b2e070e1-0371-5f73-bec6-9b726c06f930',
  })
  financesId: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'c3f1a2b3-4567-8901-2345-6789abcdef01',
  })
  ownerId: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: null,
  })
  partnerId?: string;

  @ApiResponseProperty({ type: 'string', format: 'uuid', example: null })
  updatedBy?: string;
  @ApiResponseProperty({ type: 'string', example: 'BALANCED' })
  strategy: 'BALANCED' | 'CUSTOM';
  @ApiResponseProperty({ type: 'string', example: 'monthly' })
  frequency: string;

  @ApiResponseProperty({ type: 'string', example: 'PLANNED' })
  status: 'ACTIVE' | 'CLOSED' | 'PLANNED';

  @ApiResponseProperty({ type: 'string', example: 'COP' })
  currency: string;

  @ApiResponseProperty({ type: 'boolean', example: false })
  isDefault: boolean;

  @ApiResponseProperty({
    type: 'array',
    example: [{ id: 'uuid', name: 'Entretenimiento', percentage: 10, color: '#FF5733' }],
  })
  customBuckets?: Array<{
    id: string;
    name: string;
    purpose?: string;
    percentage: number;
    color?: string;
  }>;
}

export class BudgetResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: BudgetResponseData })
  data: BudgetResponseData;
}

export class BudgetListResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: [BudgetResponseData] })
  data: BudgetResponseData[];
}

export class BudgetHistoricalSummaryItemDto {
  @ApiResponseProperty({ type: 'string', example: 'Abril' })
  month: string;

  @ApiResponseProperty({ type: 'number', example: 2026 })
  year: number;

  @ApiResponseProperty({ type: 'string', example: 'ACTIVE' })
  status: 'ACTIVE' | 'CLOSED' | 'PLANNED';

  @ApiResponseProperty({ type: 'number', example: 4500000 })
  expectedIncome: number;

  @ApiResponseProperty({ type: 'number', example: 4200000 })
  receivedIncome: number;

  @ApiResponseProperty({ type: 'number', example: 2100000 })
  totalExpenses: number;

  @ApiResponseProperty({ type: 'number', example: 840000 })
  totalSavings: number;

  @ApiResponseProperty({ type: 'number', example: 20 })
  savingsRate: number;
}

export class BudgetHistoricalSummaryResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: [BudgetHistoricalSummaryItemDto] })
  data: BudgetHistoricalSummaryItemDto[];
}
export class CreateBudgetDto {
  @ApiProperty({
    type: 'number',
    example: 4,
    description: 'Mes objetivo del presupuesto mensual (1-12)',
  })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ type: 'number', example: 2026, description: 'Ano objetivo del presupuesto' })
  @IsInt()
  @Min(1900)
  @Max(3000)
  year: number;

  @ApiProperty({
    type: 'string',
    example: 'empty',
    enum: ['empty', 'clone'],
    description:
      'Modo de creacion del presupuesto mensual. empty crea uno nuevo; clone intenta copiar configuracion del presupuesto base.',
  })
  @IsString()
  @IsIn(['empty', 'clone'])
  mode: 'empty' | 'clone';

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    example: 'b72f9b8c-8f34-4038-92f1-3eff825a70c6',
    required: false,
    nullable: true,
    description:
      'Presupuesto origen para clonar. Si no se envia y mode=clone, se intenta usar el presupuesto inmediatamente anterior.',
  })
  @IsOptional()
  @IsUUID()
  sourceBudgetId?: string;

  @ApiProperty({
    type: 'string',
    example: 'Presupuesto_Abril_de_2026',
    required: false,
    description: 'Nombre opcional del presupuesto; si no viene se genera automaticamente',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name?: string;
}
