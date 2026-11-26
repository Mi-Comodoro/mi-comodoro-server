import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateContributionDto {
  @ApiPropertyOptional({
    example: 'uuid-de-la-cuenta',
    description:
      'Cuenta de origen del aporte (debe ser del usuario). Por defecto: la cuenta de la meta.',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiProperty({ example: 100.5, description: 'Monto del aporte' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2025-04-28', description: 'Fecha del aporte' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Aporte extra del bono', description: 'Notas opcionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
