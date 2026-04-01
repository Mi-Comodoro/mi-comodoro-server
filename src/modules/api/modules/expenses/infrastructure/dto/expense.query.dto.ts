import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ExpenseStatus {
  PLANNED = 'PLANNED',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  SKIPPED = 'SKIPPED',
}

export enum CategoryBucket {
  NEEDS = 'needs',
  WANTS = 'wants',
}

export class GetPlannedExpensesQueryDto {
  @ApiPropertyOptional()
  @IsString()
  budgetId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus, { each: true })
  status?: ExpenseStatus[];

  @ApiPropertyOptional({ enum: CategoryBucket })
  @IsOptional()
  @IsEnum(CategoryBucket, { each: true })
  bucket?: CategoryBucket[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFromBill?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}
