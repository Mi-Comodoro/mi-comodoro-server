import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SavingDistributionItemDto {
  @ApiProperty({ example: 'a3f5c6e2-1234-4bcd-9abc-1234567890ab', description: 'ID de la meta' })
  @IsString()
  goalId: string;

  @ApiProperty({ example: 50, minimum: 1, maximum: 100, description: 'Porcentaje asignado' })
  @IsNumber()
  @Min(1)
  @Max(100)
  percentage: number;
}

export class UpdateSavingDistributionDto {
  @ApiProperty({
    type: [SavingDistributionItemDto],
    description: 'Lista de asignaciones: cada meta con su porcentaje',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SavingDistributionItemDto)
  distributions: SavingDistributionItemDto[];
}
