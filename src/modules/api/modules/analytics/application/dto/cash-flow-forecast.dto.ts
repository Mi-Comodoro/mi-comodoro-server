import { ApiProperty } from '@nestjs/swagger';

class MonthForecastDto {
  @ApiProperty({ example: 'may. 26' })
  month: string;

  @ApiProperty({ example: 4500000 })
  projectedIncome: number;

  @ApiProperty({ example: 3500000 })
  projectedExpenses: number;

  @ApiProperty({ example: 1000000 })
  projectedNet: number;
}

class ForecastAssumptionsDto {
  @ApiProperty({ example: true, description: 'Basado en presupuesto activo' })
  basedOnBudget: boolean;

  @ApiProperty({ example: true, description: 'Asume ingreso fijo cada mes' })
  incomeConstant: boolean;

  @ApiProperty({ example: true, description: 'No incluye gastos variables futuros' })
  expensesConstant: boolean;
}

export class CashFlowForecastDto {
  @ApiProperty({ type: [MonthForecastDto], description: 'Pronóstico a 3 meses' })
  months: MonthForecastDto[];

  @ApiProperty({ type: ForecastAssumptionsDto })
  assumptions: ForecastAssumptionsDto;
}
