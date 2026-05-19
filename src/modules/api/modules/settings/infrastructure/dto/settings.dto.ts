import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}

export class UpdateBudgetDefaultsDto {
  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  budgetAlertThreshold?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  savingsPercentage?: number;
}

export class SettingsDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() currency: string;
  @ApiProperty() language: string;
  @ApiProperty() notificationsEnabled: boolean;
  @ApiProperty() budgetAlertThreshold: number;
  @ApiProperty() savingsPercentage: number;
}

export class SettingsResponseDto {
  @ApiProperty() success: boolean;
  @ApiProperty({ type: SettingsDto }) result: SettingsDto;
}
