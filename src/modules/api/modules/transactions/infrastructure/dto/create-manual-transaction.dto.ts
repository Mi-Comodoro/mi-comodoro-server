import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export type TransactionType = 'income' | 'expense' | 'savings';

export class CreateManualTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(['income', 'expense', 'savings'])
  @IsNotEmpty()
  type: TransactionType;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsUUID()
  @IsNotEmpty()
  budgetId: string;

  @IsNotEmpty()
  transactionDate: Date;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
