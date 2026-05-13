import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ description: 'Monto cobrado', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Fecha del cobro (ISO 8601)' })
  @IsDateString()
  collectionDate: string;

  @ApiPropertyOptional({ description: 'Notas adicionales sobre el cobro' })
  @IsString()
  @IsOptional()
  notes?: string;
}
