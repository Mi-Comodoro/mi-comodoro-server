import { ApiProperty } from '@nestjs/swagger';

class MonthProjectionDto {
  @ApiProperty({ example: 'may. 26' })
  month: string;

  @ApiProperty({ example: 4700000 })
  projectedBalance: number;

  @ApiProperty({ example: 300000 })
  minimumPayments: number;
}

export class DebtProjectionDto {
  @ApiProperty({ type: [MonthProjectionDto], description: 'Proyección lineal a 6 meses' })
  projection: MonthProjectionDto[];

  @ApiProperty({
    example: true,
    description: 'Proyección simplificada sin interés compuesto',
  })
  simplified: boolean;
}
