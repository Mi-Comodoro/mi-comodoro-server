import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBetaRequestDto {
  @ApiProperty({ example: 'persona@ejemplo.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: true, description: 'Declara ser mayor de 18 años' })
  @IsBoolean()
  @Equals(true, { message: 'Debes confirmar que eres mayor de 18 años.' })
  adult: boolean;

  @ApiProperty({
    example: true,
    description: 'Autoriza el tratamiento de sus datos para gestionar el acceso a la beta',
  })
  @IsBoolean()
  @Equals(true, { message: 'Debes autorizar el tratamiento de tus datos.' })
  consent: boolean;

  @ApiProperty({ example: '2.0', description: 'Versión de la política que se mostró' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  policyVersion: string;

  @ApiPropertyOptional({ description: 'Campo trampa anti-bots: debe llegar vacío' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export enum BetaStatusFilter {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  registered = 'registered',
}

export class ListBetaRequestsQueryDto {
  @ApiPropertyOptional({ enum: BetaStatusFilter })
  @IsOptional()
  @IsEnum(BetaStatusFilter)
  status?: BetaStatusFilter;
}
