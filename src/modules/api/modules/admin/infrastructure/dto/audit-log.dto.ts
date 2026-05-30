import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export type AuditAction =
  | 'USER_ROLE_CHANGED'
  | 'PLAN_CHANGED'
  | 'TRIAL_EXTENDED'
  | 'USER_DELETED'
  | 'CONFIG_UPDATED'
  | 'ANNOUNCEMENT_SENT';

export type AuditTargetType = 'user' | 'config' | 'announcement';

export class CreateAuditLogDto {
  adminId: string;
  adminHandle: string;
  action: AuditAction;
  targetId?: string | null;
  targetType?: AuditTargetType | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por acción' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de objetivo',
    enum: ['user', 'config', 'announcement'],
  })
  @IsOptional()
  @IsIn(['user', 'config', 'announcement'])
  targetType?: string;

  @ApiPropertyOptional({ description: 'Fecha inicio (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class AuditLogItemDto {
  @ApiProperty() id: string;
  @ApiProperty() adminId: string;
  @ApiProperty() adminHandle: string;
  @ApiProperty() action: string;
  @ApiPropertyOptional() targetId: string | null;
  @ApiPropertyOptional() targetType: string | null;
  @ApiPropertyOptional() before: Record<string, unknown> | null;
  @ApiPropertyOptional() after: Record<string, unknown> | null;
  @ApiPropertyOptional() ip: string | null;
  @ApiProperty() createdAt: Date;
}
