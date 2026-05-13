import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAccountPayableDto {
  @ApiProperty({ description: 'Nombre de la deuda' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la deuda' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: ['loan', 'credit_card', 'installment', 'other'],
    description: 'Tipo de deuda',
  })
  @IsEnum(['loan', 'credit_card', 'installment', 'other'])
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Monto original de la deuda' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  originalAmount: number;

  @ApiPropertyOptional({ description: 'Pago mínimo mensual' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minimumPayment?: number;

  @ApiPropertyOptional({ description: 'Tasa de interés anual (porcentaje)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  interestRate?: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento total de la deuda' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Fecha del próximo pago' })
  @IsDateString()
  @IsOptional()
  nextPaymentDate?: string;
}
