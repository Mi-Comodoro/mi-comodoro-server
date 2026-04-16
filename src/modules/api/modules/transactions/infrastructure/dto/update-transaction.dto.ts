import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTransactionDto {
  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsOptional()
  transactionDate?: Date;
}
