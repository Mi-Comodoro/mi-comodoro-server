import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import type { MemberRole } from '../../domain/group-member';
import type { GroupType } from '../../domain/user-group';

export type TripInvitationAction = 'accept_full' | 'accept_half' | 'accept_no_budget' | 'decline';

export class CreateGroupDto {
  @ApiProperty({ example: 'Familia Álvarez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['SHARED', 'FAMILIAR', 'TRAVEL'], example: 'SHARED' })
  @IsEnum(['SHARED', 'FAMILIAR', 'TRAVEL'])
  type: GroupType;

  @ApiPropertyOptional({ example: 5, minimum: 2, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(20)
  maxMembers?: number;
}

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @ApiPropertyOptional({ example: 2000000, description: 'Meta monetaria del grupo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  goal?: number | null;
}

export class AddMemberDto {
  @ApiProperty({ example: 'uuid-del-usuario' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: ['CO_ORGANIZER', 'MEMBER', 'VIEWER'], example: 'MEMBER' })
  @IsOptional()
  @IsEnum(['CO_ORGANIZER', 'MEMBER', 'VIEWER'])
  role?: Exclude<MemberRole, 'ORGANIZER'>;
}

export class InviteWithContextDto {
  @ApiProperty({ example: 'uuid-del-usuario' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: ['CO_ORGANIZER', 'MEMBER', 'VIEWER'], example: 'MEMBER' })
  @IsOptional()
  @IsEnum(['CO_ORGANIZER', 'MEMBER', 'VIEWER'])
  role?: Exclude<MemberRole, 'ORGANIZER'>;

  @ApiPropertyOptional({
    example: 500000,
    description: 'Monto planificado del organizador para el viaje',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedAmount?: number;
}

export class RespondGroupInvitationDto {
  @ApiProperty({ enum: ['accept_full', 'accept_half', 'accept_no_budget', 'decline'] })
  @IsEnum(['accept_full', 'accept_half', 'accept_no_budget', 'decline'])
  action: TripInvitationAction;

  @ApiPropertyOptional({
    example: 'uuid-del-presupuesto',
    description: 'ID del presupuesto donde crear el gasto (usa el default si no se envía)',
  })
  @IsOptional()
  @IsUUID()
  budgetId?: string;

  @ApiPropertyOptional({
    example: 'uuid-de-categoria',
    description: 'Categoría para el gasto planificado',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
