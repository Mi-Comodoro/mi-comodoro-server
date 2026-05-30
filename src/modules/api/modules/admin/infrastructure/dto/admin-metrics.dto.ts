import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UserGrowthQueryDto {
  @ApiProperty({ enum: ['30d', '90d', '12m'], description: 'Período de análisis' })
  @IsIn(['30d', '90d', '12m'])
  period: '30d' | '90d' | '12m';
}

export class UserGrowthDataPointDto {
  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  date: string;

  @ApiProperty({ example: 5 })
  newUsers: number;

  @ApiProperty({ example: 120 })
  cumulative: number;
}

export class UserGrowthSummaryDto {
  @ApiProperty({ example: 47 })
  total: number;

  @ApiProperty({ example: '2026-04-30T00:00:00.000Z' })
  periodStart: string;

  @ApiProperty({ example: '2026-05-30T00:00:00.000Z' })
  periodEnd: string;

  @ApiProperty({ example: 12.5, description: '% de crecimiento vs período anterior equivalente' })
  growthRate: number;
}

export class UserGrowthResponseDto {
  @ApiProperty({ enum: ['30d', '90d', '12m'] })
  period: string;

  @ApiProperty({ type: [UserGrowthDataPointDto] })
  data: UserGrowthDataPointDto[];

  @ApiProperty({ type: UserGrowthSummaryDto })
  summary: UserGrowthSummaryDto;
}

export class MetricsDeltasDto {
  @ApiProperty({ example: 5, description: 'Diferencia vs mes anterior' })
  totalUsers: number;

  @ApiProperty({ example: 3 })
  activeThisMonth: number;

  @ApiProperty({ example: 4 })
  trialUsers: number;

  @ApiProperty({ example: 1 })
  payingUsers: number;
}

export class AdminMetricsSummaryDto {
  @ApiProperty({ example: 320 })
  totalUsers: number;

  @ApiProperty({ example: 85, description: 'Usuarios con al menos 1 tx en el mes actual' })
  activeThisMonth: number;

  @ApiProperty({ example: 210 })
  trialUsers: number;

  @ApiProperty({ example: 110, description: 'Usuarios con plan PLUS, PRO o PARTNER' })
  payingUsers: number;

  @ApiProperty({ example: 34.37, description: '% de trials que pasaron a pago' })
  conversionRate: number;

  @ApiProperty({ example: 415 })
  activeBudgets: number;

  @ApiProperty({ type: MetricsDeltasDto })
  deltas: MetricsDeltasDto;
}
