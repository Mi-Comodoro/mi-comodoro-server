import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { CompoundingFrequency } from '../../domain/account';

export class CreateAccountDto {
  @ApiProperty({ example: 'Ahorro Flexible', description: 'Nombre de la cuenta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '0.05', description: 'Tasa de interés en formato string decimal' })
  @IsNumber()
  @IsNotEmpty()
  interestRate: number;

  @ApiProperty({
    example: 'monthly',
    description: 'Frecuencia de capitalización (e.g., daily, monthly, yearly)',
  })
  @IsString()
  @IsNotEmpty()
  compoundingFrequency: CompoundingFrequency;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    example: 'Cuenta para fondos de emergencia',
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({
    example: 'bank',
    required: false,
    description: 'Tipo de cuenta (e.g., bank, cash, savings)',
  })
  @IsString()
  @IsOptional()
  type: string;

  @ApiProperty({
    example: false,
    default: false,
    required: false,
    description: 'Indica si es la cuenta principal del usuario',
  })
  @IsBoolean()
  @IsOptional()
  isPrimary: boolean;
}
