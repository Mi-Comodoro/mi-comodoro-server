import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountReceivableDto {
  @ApiProperty({ description: 'Nombre o título de la cuenta por cobrar' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción adicional' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Nombre del deudor' })
  @IsString()
  @IsOptional()
  debtor?: string;

  @ApiProperty({ description: 'Monto original a cobrar', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  originalAmount: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
