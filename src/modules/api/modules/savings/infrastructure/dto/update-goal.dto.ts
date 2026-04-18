import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateGoalDto {
  @ApiProperty({ required: false, example: 'Fondo de emergencia' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, example: 'emergency' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false, example: 5000 })
  @ValidateIf((o) => o.targetAmount !== undefined && o.targetAmount !== null)
  @IsNumber()
  @Min(1)
  targetAmount?: number | null;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @ValidateIf((o) => o.targetDate !== undefined && o.targetDate !== null)
  @Type(() => Date)
  @IsDate()
  targetDate?: Date | null;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'Cambiar cuenta asociada' })
  @IsOptional()
  @IsString()
  accountId?: string;
}
