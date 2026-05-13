import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class TransferBalanceDto {
  @ApiPropertyOptional({ description: 'UUID del presupuesto destino', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  targetBudgetId?: string;

  @ApiPropertyOptional({ description: 'UUID de la meta de ahorro destino', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  goalId?: string;

  @ApiProperty({ description: 'Monto a transferir', example: 50000, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
