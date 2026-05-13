import { ApiProperty } from '@nestjs/swagger';

class ApSummaryDto {
  @ApiProperty({ example: 5000000 })
  total: number;

  @ApiProperty({ example: 300000 })
  monthlyCommitment: number;

  @ApiProperty({ example: 1 })
  overdueCount: number;
}

class ArSummaryDto {
  @ApiProperty({ example: 2000000 })
  total: number;

  @ApiProperty({ example: 500000 })
  expectedThisMonth: number;

  @ApiProperty({ example: 0 })
  overdueCount: number;
}

class NetPositionSummaryDto {
  @ApiProperty({ type: ApSummaryDto })
  accountsPayable: ApSummaryDto;

  @ApiProperty({ type: ArSummaryDto })
  accountsReceivable: ArSummaryDto;
}

export class NetPositionDto {
  @ApiProperty({ example: 4000000, description: 'Ingreso mensual planeado del presupuesto activo' })
  totalAssets: number;

  @ApiProperty({ example: 5000000, description: 'Suma de cuentas por pagar activas' })
  totalDebts: number;

  @ApiProperty({ example: 2000000, description: 'Suma de cuentas por cobrar activas' })
  totalReceivable: number;

  @ApiProperty({ example: 1000000, description: 'Activos + cobros - deudas' })
  netPosition: number;

  @ApiProperty({ example: 0.52, description: 'Deuda total / ingreso anual' })
  debtToIncomeRatio: number;

  @ApiProperty({ type: NetPositionSummaryDto })
  summary: NetPositionSummaryDto;
}
