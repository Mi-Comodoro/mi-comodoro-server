import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateContributionDto {
  @ApiPropertyOptional({
    example: 'uuid-de-la-cuenta',
    description: 'ID de la cuenta de ahorro (requerido si contributionType es internal)',
  })
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => o.contributionType === 'internal')
  @IsNotEmpty({ message: 'accountId es requerido cuando contributionType es internal' })
  accountId?: string;

  @ApiProperty({ example: 100.5, description: 'Monto del aporte' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2025-04-28', description: 'Fecha del aporte' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Aporte extra del bono', description: 'Notas opcionales' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: ['internal', 'external'],
    example: 'external',
    description:
      'Tipo de aporte: internal (desde una cuenta del sistema) o external (fuera del sistema). Por defecto: external.',
  })
  @IsOptional()
  @IsEnum(['internal', 'external'])
  contributionType?: 'internal' | 'external';
}
