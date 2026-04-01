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
  isFromBill: boolean;
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
