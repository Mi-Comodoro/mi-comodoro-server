import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
}
