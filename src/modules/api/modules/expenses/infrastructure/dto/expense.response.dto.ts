import { ApiProperty } from '@nestjs/swagger';

export class PlannedExpenseItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  expectedAmount: number;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ enum: ['needs', 'wants'], nullable: true })
  bucket: string;

  @ApiProperty()
  isEssential: boolean;

  @ApiProperty()
  isFromBill: boolean;

  @ApiProperty({ nullable: true, required: false })
  customBucketId?: string | null;
}

export class PaginationMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PlannedExpensesResponseDto {
  @ApiProperty({ type: [PlannedExpenseItemDto] })
  data: PlannedExpenseItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class CompletedExpenseTransactionDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 950000 })
  amount: number;

  @ApiProperty({ example: 'expense' })
  type: string;

  @ApiProperty({ example: 'Arriendo' })
  source: string;

  @ApiProperty({ example: '2026-04-01' })
  transactionDate: Date;
}

export class CompletedPlannedExpenseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Arriendo' })
  name: string;

  @ApiProperty({ example: 950000 })
  expectedAmount: number;

  @ApiProperty({ example: 'PAID' })
  status: string;

  @ApiProperty({ example: '2026-05-01' })
  dueDate: Date;
}

export class CompletePlannedExpenseDataDto {
  @ApiProperty({ type: CompletedPlannedExpenseDto })
  plannedExpense: CompletedPlannedExpenseDto;

  @ApiProperty({ type: CompletedExpenseTransactionDto })
  transaction: CompletedExpenseTransactionDto;
}

export class CompletePlannedExpenseResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CompletePlannedExpenseDataDto })
  data: CompletePlannedExpenseDataDto;
}
export class UnplannedExpenseTransactionDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 950000 })
  amount: number;

  @ApiProperty({ example: 'expense' })
  type: string;

  @ApiProperty({ example: 'Compra imprevista' })
  source: string;

  @ApiProperty({ example: 'Compra imprevista', required: false, nullable: true })
  description?: string;

  @ApiProperty({ example: '2026-04-15T00:00:00.000Z' })
  transactionDate: Date;

  @ApiProperty({ example: 'uuid' })
  budgetId: string;

  @ApiProperty({ example: 'uuid' })
  categoryId: string;
}

export class UnplannedExpenseDataDto {
  @ApiProperty({ type: UnplannedExpenseTransactionDto })
  transaction: UnplannedExpenseTransactionDto;
}

export class UnplannedExpenseResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UnplannedExpenseDataDto })
  data: UnplannedExpenseDataDto;
}
