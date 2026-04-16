import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsDateString, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

import { PlannedSavingStatus } from '../../../savings/domain/savings-planned';
import { INCOME_STATUS } from '../../domain/income-planned';

export class PlannedIncomeResponseDataDto {
  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f',
  })
  id: string;

  @ApiResponseProperty({ type: 'number', example: 3500.5 })
  amount: number;

  @ApiResponseProperty({ type: 'string', example: 'Salario principal' })
  source: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-03-15T00:00:00.000Z',
  })
  date: Date;

  @ApiResponseProperty({
    enum: ['PENDING', 'RECEIVED', 'SKIPPED'],
    example: 'PENDING',
  })
  status: INCOME_STATUS;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
  })
  budgetId: string;

  @ApiResponseProperty({
    type: 'string',
    example: '',
  })
  incomeSourceId: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-03-01T08:30:00.000Z',
  })
  createdAt: Date;

  @ApiResponseProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-03-01T08:30:00.000Z',
  })
  updatedAt: Date;
}

export class PlannedSavingResponseDataDto {
  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: '5d5d1e4f-6796-4f88-a0f2-2ca1ed7e1f5b',
  })
  id: string;

  @ApiResponseProperty({ type: 'number', example: 700.1 })
  amount: number;

  @ApiResponseProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-03-15T00:00:00.000Z',
  })
  date: Date;

  @ApiResponseProperty({
    enum: [PlannedSavingStatus.PENDING, PlannedSavingStatus.COMPLETED],
    example: PlannedSavingStatus.PENDING,
  })
  status: PlannedSavingStatus;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: '8f754709-bfe4-4e3f-8613-bfc4e2ed064b',
  })
  accountId: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
  })
  budgetId: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f',
  })
  plannedIncomeId: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'b95532df-0849-4b16-9e32-55241cc0d04f',
  })
  savingGoalId: string;
}

export class MarkPlannedIncomeAsReceivedResponseDataDto {
  @ApiResponseProperty({ type: PlannedIncomeResponseDataDto })
  plannedIncome: PlannedIncomeResponseDataDto;

  @ApiResponseProperty({ type: [PlannedSavingResponseDataDto] })
  plannedSavings: PlannedSavingResponseDataDto[];
}

export class PlannedIncomeListResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: [PlannedIncomeResponseDataDto] })
  data: PlannedIncomeResponseDataDto[];
}

export class MarkPlannedIncomeAsReceivedResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: MarkPlannedIncomeAsReceivedResponseDataDto })
  data: MarkPlannedIncomeAsReceivedResponseDataDto;
}

export class PlannedIncomeResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: PlannedIncomeResponseDataDto })
  data: PlannedIncomeResponseDataDto;
}

export class UnplannedIncomeTransactionResponseDataDto {
  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f',
  })
  id: string;

  @ApiResponseProperty({ type: 'number', example: 3500.5 })
  amount: number;

  @ApiResponseProperty({ type: 'string', example: 'Bono extraordinario' })
  source: string;

  @ApiResponseProperty({ type: 'string', example: 'income' })
  type: 'income';

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
  })
  budgetId: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'b2e070e1-0371-5f73-bec6-9b726c06f930',
  })
  userId: string;

  @ApiResponseProperty({ type: 'string', format: 'date-time', example: '2026-04-15T00:00:00.000Z' })
  transactionDate: Date;

  @ApiResponseProperty({ type: 'string', format: 'uuid', example: null })
  toAccountId?: string;
}

export class UnplannedIncomeResponseDataDto {
  @ApiResponseProperty({ type: UnplannedIncomeTransactionResponseDataDto })
  transaction: UnplannedIncomeTransactionResponseDataDto;

  @ApiResponseProperty({ type: [PlannedSavingResponseDataDto] })
  plannedSavings: PlannedSavingResponseDataDto[];
}

export class UnplannedIncomeResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: UnplannedIncomeResponseDataDto })
  data: UnplannedIncomeResponseDataDto;
}

export class CreateUnplannedIncomeDto {
  @ApiProperty({ type: 'number', example: 1200.5, description: 'Monto del ingreso no planificado' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    type: 'string',
    example: 'Bono extraordinario',
    description: 'Fuente o descripcion del ingreso',
  })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
    description: 'UUID del presupuesto activo al que pertenece el ingreso',
  })
  @IsUUID()
  budgetId: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-04-15T00:00:00.000Z',
    description: 'Fecha real del ingreso no planificado',
  })
  @IsDateString()
  date: string;
}
export class CreateManualPlannedIncomeDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    example: 'a4f5cbfc-8f34-4038-92f1-3eff825a70c6',
    description: 'UUID del presupuesto al que pertenece el ingreso puntual',
  })
  @IsUUID()
  budgetId: string;

  @ApiProperty({ type: 'number', example: 1200.5, description: 'Monto del ingreso puntual' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    type: 'string',
    example: 'Bono extraordinario',
    description: 'Nombre o fuente visible del ingreso puntual',
  })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-04-15T00:00:00.000Z',
    description: 'Fecha estimada o real del ingreso puntual',
  })
  @Type(() => Date)
  @IsNotEmpty()
  @IsDate()
  date: Date;
}
