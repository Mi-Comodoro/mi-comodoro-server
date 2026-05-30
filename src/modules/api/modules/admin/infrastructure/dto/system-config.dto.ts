import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateSystemConfigDto {
  @ApiProperty({ example: '14', description: 'Nuevo valor (siempre string)' })
  @IsString()
  @MinLength(1)
  value: string;
}

export class SystemConfigItemDto {
  @ApiProperty({ example: 'trial_duration_days' })
  key: string;

  @ApiProperty({ example: '14' })
  value: string;

  @ApiProperty({ example: 'Días de prueba para nuevos usuarios', nullable: true })
  description: string | null;

  @ApiProperty({ example: '2026-05-30T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  updatedBy: string | null;
}
