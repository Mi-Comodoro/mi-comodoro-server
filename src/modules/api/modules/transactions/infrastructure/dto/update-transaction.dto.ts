import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ example: 75000, description: 'Nuevo monto de la transacción' })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 'Restaurante', description: 'Nueva fuente de la transacción' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Almuerzo de trabajo', description: 'Nueva descripción' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-categoria', description: 'UUID de la nueva categoría' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: '2026-05-16', description: 'Nueva fecha de la transacción' })
  @IsOptional()
  transactionDate?: Date;
}
