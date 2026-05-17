import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export type TransactionType = 'income' | 'expense' | 'savings';

export class CreateManualTransactionDto {
  @ApiProperty({ example: 50000, description: 'Monto de la transacción' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: ['income', 'expense', 'savings'], example: 'expense' })
  @IsEnum(['income', 'expense', 'savings'])
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ example: 'Supermercado', description: 'Fuente u origen de la transacción' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ example: 'uuid-categoria', description: 'UUID de la categoría' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'uuid-presupuesto', description: 'UUID del presupuesto' })
  @IsUUID()
  @IsNotEmpty()
  budgetId: string;

  @ApiProperty({ example: '2026-05-16', description: 'Fecha de la transacción' })
  @IsNotEmpty()
  transactionDate: Date;

  @ApiPropertyOptional({ example: 'uuid-cuenta', description: 'UUID de la cuenta (opcional)' })
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ example: 'Compra semanal', description: 'Descripción adicional' })
  @IsString()
  @IsOptional()
  description?: string;
}
