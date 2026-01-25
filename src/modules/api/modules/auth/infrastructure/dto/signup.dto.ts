import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PASSWORD_REGEX } from '@/common/constants';

import { FinancialProfileEnum, GenderEnum, UsageEnum } from '../enum/signup.emun';

export class SignUpDto {
  @ApiProperty({
    example: 'user@email.com',
    description: 'Email único del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'Contraseña del usuario (sin hash)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message:
      'La contraseña debe tener mínimo 8 caracteres, no contener espacios y tener al menos un carácter especial',
  })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Nombre real del usuario (para métricas y personalización)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'Nombre visible dentro de la aplicación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({
    example: GenderEnum.MALE,
    description: 'Género del usuario (opcional)',
    enum: GenderEnum,
  })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;

  @ApiPropertyOptional({
    example: 'CO',
    description: 'Código de país ISO 3166-1 alpha-2',
  })
  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @ApiPropertyOptional({
    example: UsageEnum.PERSONAL,
    description: 'Tipo de uso de la cuenta',
    enum: UsageEnum,
  })
  @IsOptional()
  @IsEnum(UsageEnum)
  usageType?: UsageEnum;

  @ApiPropertyOptional({
    example: FinancialProfileEnum.EMPLOYEE,
    description: 'Perfil financiero del usuario',
    enum: FinancialProfileEnum,
  })
  @IsOptional()
  @IsEnum(FinancialProfileEnum)
  financialProfile?: FinancialProfileEnum;
}

export class AccountResponseDto {
  @ApiProperty({ example: '2f303bd7-7db1-4c5f-8d32-f9227617a7bc' })
  id: string;

  @ApiProperty({ example: 'John Doe', description: 'Nombre de la cuenta' })
  name: string;

  @ApiPropertyOptional({ example: 'John', description: 'Nombre visible dentro de la app' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'MALE', enum: GenderEnum, description: 'Género de la cuenta' })
  gender?: GenderEnum;

  @ApiPropertyOptional({ example: 'CO', description: 'Código de país ISO 3166-1 alpha-2' })
  country?: string;

  @ApiPropertyOptional({
    example: 'PERSONAL',
    enum: UsageEnum,
    description: 'Tipo de uso de la cuenta',
  })
  usageType?: UsageEnum;

  @ApiPropertyOptional({
    example: 'EMPLOYEE',
    enum: FinancialProfileEnum,
    description: 'Perfil financiero',
  })
  financialProfile?: FinancialProfileEnum;

  @ApiProperty({ example: true, description: 'Indica si la cuenta está activa' })
  isActive: boolean;
}

export class SignUpResponseDataDto {
  @ApiProperty({ example: '7918ef8b-9c7c-454e-8e26-a6d5dfc4faa5' })
  id: string;

  @ApiProperty({ example: 'user4@email.com', description: 'Email del usuario' })
  email: string;

  @ApiProperty({ example: true, description: 'Indica si el usuario está activo' })
  isActive: boolean;

  @ApiProperty({ type: AccountResponseDto, description: 'Información de la cuenta asociada' })
  account: AccountResponseDto;
}

export class SignUpResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ type: SignUpResponseDataDto, description: 'Datos del usuario creado' })
  data: SignUpResponseDataDto;
}
