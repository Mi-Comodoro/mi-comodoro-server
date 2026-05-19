import { ApiProperty } from '@nestjs/swagger';

class SavingsTrendPointDto {
  @ApiProperty({ example: 'may. 25' })
  month: string;

  @ApiProperty({ example: 150000.0 })
  amount: number;
}

export class SavingsTrendDto {
  @ApiProperty({ type: [SavingsTrendPointDto] })
  trend: SavingsTrendPointDto[];
}
