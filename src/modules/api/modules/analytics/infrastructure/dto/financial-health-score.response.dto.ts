import { ApiProperty } from '@nestjs/swagger';

export class FinancialHealthScoreResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'uuid-v4' })
  userId: string;

  @ApiProperty({ example: 72, description: 'Puntuación total (0-100)' })
  totalScore: number;

  @ApiProperty({ example: 20, description: 'Flujo de caja (máx 25)' })
  cashFlowScore: number;

  @ApiProperty({ example: 28, description: 'Ahorro y metas (máx 35)' })
  savingsScore: number;

  @ApiProperty({ example: 14, description: 'Control de gastos (máx 20)' })
  expenseScore: number;

  @ApiProperty({ example: 10, description: 'Deudas — neutro hasta módulo AP (máx 20)' })
  debtScore: number;

  @ApiProperty({
    example: 'healthy',
    enum: ['critical', 'at_risk', 'regular', 'healthy', 'optimal'],
  })
  level: string;

  @ApiProperty({ example: '2026-04-28T00:00:00.000Z' })
  calculatedAt: Date;

  @ApiProperty({ example: 12, description: 'Total de transacciones en presupuestos evaluados' })
  totalTransactions: number;
}
