import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Alimentación' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'expense', enum: ['income', 'expense', 'savings'] })
  @IsOptional()
  @IsIn(['income', 'expense', 'savings'])
  type?: 'income' | 'expense' | 'savings';

  @ApiPropertyOptional({ example: 'needs', enum: ['needs', 'wants'] })
  @IsOptional()
  @IsIn(['needs', 'wants'])
  bucket?: 'needs' | 'wants';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isSelectable?: boolean;
}
