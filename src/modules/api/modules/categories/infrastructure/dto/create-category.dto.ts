import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentación' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'expense', enum: ['income', 'expense', 'savings'] })
  @IsIn(['income', 'expense', 'savings'])
  type: 'income' | 'expense' | 'savings';

  @ApiPropertyOptional({ example: 'needs', enum: ['needs', 'wants'] })
  @IsOptional()
  @IsIn(['needs', 'wants'])
  bucket?: 'needs' | 'wants';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isSelectable?: boolean;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  parentId?: string;
}
