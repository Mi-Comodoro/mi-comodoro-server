import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { CompoundingFrequency } from '../../domain/account';

export class UpdateAccountDto {
  @ApiProperty({ example: 'Ahorro Flexible', description: 'Nombre de la cuenta', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Cuenta para fondos de emergencia',
    description: 'Descripción de la cuenta',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 0.05,
    description: 'Tasa de interés anual',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  interestRate?: number;

  @ApiProperty({
    example: 'monthly',
    description: 'Frecuencia de capitalización (daily, monthly, annually)',
    required: false,
  })
  @IsString()
  @IsOptional()
  compoundingFrequency?: CompoundingFrequency;

  @ApiProperty({
    example: true,
    description: 'Indica si la cuenta está activa',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
