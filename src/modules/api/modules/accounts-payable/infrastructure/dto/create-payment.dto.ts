import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Monto del pago' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Fecha del pago (ISO 8601)' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'Notas del pago' })
  @IsString()
  @IsOptional()
  notes?: string;
}
