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
import { AccountType } from '@/common/enums/account-type.enum';

import { FinancialProfileEnum, GenderEnum, UsageEnum } from '../../../shared/enum/enum';
import { SignInResponseDataDto } from './signin.dto';

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
    example: FinancialProfileEnum.employee,
    description: 'Perfil financiero del usuario',
    enum: FinancialProfileEnum,
  })
  @IsOptional()
  @IsEnum(FinancialProfileEnum)
  financialProfile?: FinancialProfileEnum;

  @ApiPropertyOptional({
    example: 'free',
    description: 'Plan de cuenta (trial por defecto)',
    enum: AccountType,
  })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({
    example: '+573001234567',
    description: 'Número de teléfono del usuario (opcional)',
  })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'juan_perez',
    description: 'Nombre de usuario único (solo letras minúsculas, números y _)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'El handle solo puede contener letras minúsculas, números y _',
  })
  handle?: string;
}

export class SignUpResponseDataDto extends SignInResponseDataDto {
  @ApiProperty({
    example: 'PENDING',
    description: 'Estado actual del onboarding del usuario recién registrado',
  })
  onboarding: string;
}

export class SignUpResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({
    type: SignUpResponseDataDto,
    description: 'Datos de la sesión del usuario recién creado',
  })
  data: SignUpResponseDataDto;
}
