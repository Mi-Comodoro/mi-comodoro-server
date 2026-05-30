import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import type { MemberRole } from '../../domain/group-member';
import type { GroupType } from '../../domain/user-group';

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

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

export class AddMemberDto {
  @ApiProperty({ example: 'uuid-del-usuario' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: ['CO_ORGANIZER', 'MEMBER', 'VIEWER'], example: 'MEMBER' })
  @IsEnum(['CO_ORGANIZER', 'MEMBER', 'VIEWER'])
  role: Exclude<MemberRole, 'ORGANIZER'>;
}
