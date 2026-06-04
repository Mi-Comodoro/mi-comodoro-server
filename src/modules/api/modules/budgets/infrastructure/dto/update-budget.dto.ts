import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class CustomBucketDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ example: 'Entretenimiento' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Gastos de ocio y entretenimiento' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  purpose?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  percentage: number;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 'Presupuesto Mayo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'BALANCED', enum: ['BALANCED', 'CUSTOM'] })
  @IsOptional()
  @IsIn(['BALANCED', 'CUSTOM'])
  strategy?: 'BALANCED' | 'CUSTOM';

  @ApiPropertyOptional({ example: 1500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  needsLimit?: number;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wantsLimit?: number;

  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  savingsLimit?: number;

  @ApiPropertyOptional({
    type: [CustomBucketDto],
    description: 'Buckets personalizados para estrategia CUSTOM',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomBucketDto)
  customBuckets?: CustomBucketDto[];
}
