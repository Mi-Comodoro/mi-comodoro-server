import { ApiProperty } from '@nestjs/swagger';

class PillarCashFlowDto {
  @ApiProperty({ example: 25 })
  score: number;

  @ApiProperty({ example: 25 })
  max: number;

  @ApiProperty({ example: 90.0, description: 'Tasa de flujo neto sobre ingresos (%)' })
  rate: number;

  @ApiProperty({ example: 'Óptimo' })
  label: string;
}

class PillarSavingsDto {
  @ApiProperty({ example: 25 })
  score: number;

  @ApiProperty({ example: 25 })
  max: number;

  @ApiProperty({ example: 100.0, description: 'Tasa de ahorro ejecutado vs planeado (%)' })
  rate: number;

  @ApiProperty({ example: 'Meta cumplida' })
  label: string;
}

class PillarExpensesDto {
  @ApiProperty({ example: 25 })
  score: number;

  @ApiProperty({ example: 25 })
  max: number;

  @ApiProperty({ example: 0.0, description: 'Porcentaje de exceso sobre lo planeado' })
  excessPct: number;

  @ApiProperty({ example: 'Dentro del plan' })
  label: string;
}

class PillarDebtDto {
  @ApiProperty({ example: 20 })
  score: number;

  @ApiProperty({ example: 25 })
  max: number;

  @ApiProperty({ example: 23.33, description: 'Debt-to-income ratio (%)' })
  dti: number;

  @ApiProperty({ example: 'Manejable' })
  label: string;
}

class ScorePillarsDto {
  @ApiProperty({ type: PillarCashFlowDto })
  cashFlow: PillarCashFlowDto;

  @ApiProperty({ type: PillarSavingsDto })
  savings: PillarSavingsDto;

  @ApiProperty({ type: PillarExpensesDto })
  expenses: PillarExpensesDto;

  @ApiProperty({ type: PillarDebtDto })
  debt: PillarDebtDto;
}

class ScoreDto {
  @ApiProperty({ example: 95 })
  total: number;

  @ApiProperty({ example: 'Óptimo' })
  label: string;

  @ApiProperty({ type: ScorePillarsDto })
  pillars: ScorePillarsDto;

  @ApiProperty({ example: 'Deudas es tu mayor área de mejora.' })
  insight: string;

  @ApiProperty({ example: 'Deudas' })
  weakestPillar: string;
}

class DebtRatioDto {
  @ApiProperty({ example: 23.33 })
  ratio: number;

  @ApiProperty({ example: 'Saludable' })
  label: string;

  @ApiProperty({ example: 'primary' })
  badge: string;

  @ApiProperty({ example: 28000000 })
  totalDebt: number;

  @ApiProperty({ example: 120000000 })
  annualIncomeEstimate: number;
}

class TotalsDto {
  @ApiProperty({ example: 10000000 })
  income: number;

  @ApiProperty({ example: 1000000 })
  expenses: number;

  @ApiProperty({ example: 2000000 })
  savings: number;
}

export class FinancialHealthScoreResponseDto {
  @ApiProperty({ type: ScoreDto })
  score: ScoreDto;

  @ApiProperty({ type: DebtRatioDto })
  debtRatio: DebtRatioDto;

  @ApiProperty({ example: 42 })
  totalTransactions: number;

  @ApiProperty({ type: TotalsDto })
  totals: TotalsDto;
}
