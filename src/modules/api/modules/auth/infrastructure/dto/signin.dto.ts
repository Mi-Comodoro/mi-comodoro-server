import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNotEmptyObject,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PASSWORD_REGEX } from '@/common/constants';

export class SignInDto {
  @ApiProperty({
    example: 'user@email.com',
    description: 'Email unico del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'Contrasena del usuario (sin hash)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message:
      'La contrasena debe tener minimo 8 caracteres, no contener espacios y tener al menos un caracter especial',
  })
  password: string;
}

export class GoogleSignInBodyDataDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2ZjY2ZmQ4Z...firebase-id-token',
    description: 'Firebase ID token emitido por Google/Firebase Auth',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({
    example: 'Miguel Alvarez',
    description: 'Nombre visible del usuario autenticado con Google',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class GoogleSignInDto {
  @ApiProperty({
    type: GoogleSignInBodyDataDto,
    description: 'Payload esperado para autenticacion con Google',
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => GoogleSignInBodyDataDto)
  data: GoogleSignInBodyDataDto;
}

export class SignInResponseDataDto {
  @ApiProperty({ description: 'Access token JWT (15 min)' })
  token: string;

  @ApiProperty({ description: 'Refresh token opaco (7 dias)' })
  refreshToken: string;

  @ApiProperty({ example: 'TRIAL', description: 'Tipo de cuenta del usuario' })
  accountType: string;

  @ApiProperty({
    example: 1775097600,
    description: 'Fecha de expiracion del access token en unix timestamp (segundos)',
  })
  expiresAt: number;
}

export class GoogleSignInResponseDataDto extends SignInResponseDataDto {
  @ApiProperty({
    example: 'PENDING',
    description: 'Estado actual del onboarding del usuario autenticado con Google',
  })
  onboarding: string;
}

export class SignInResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la operacion fue exitosa' })
  success: boolean;

  @ApiProperty({ type: SignInResponseDataDto, description: 'Datos de la sesion del usuario' })
  data: SignInResponseDataDto;
}

export class GoogleSignInResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la operacion fue exitosa' })
  success: boolean;

  @ApiProperty({
    type: GoogleSignInResponseDataDto,
    description: 'Datos de la sesion del usuario autenticado con Google',
  })
  data: GoogleSignInResponseDataDto;
}

export class LogoutResponseDataDto {
  @ApiProperty({ example: 'Logout successful', description: 'Resultado del cierre de sesion' })
  message: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token opaco para renovar la sesion' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RefreshResponseDataDto {
  @ApiProperty({ description: 'Nuevo access token JWT (15 min)' })
  token: string;

  @ApiProperty({ description: 'Nuevo refresh token opaco (7 dias)' })
  refreshToken: string;

  @ApiProperty({
    example: 1775097600,
    description: 'Fecha de expiracion del access token en unix timestamp (segundos)',
  })
  expiresAt: number;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la operacion fue exitosa' })
  success: boolean;

  @ApiProperty({ type: LogoutResponseDataDto, description: 'Resultado del cierre de sesion' })
  data: LogoutResponseDataDto;
}

export class RefreshResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la operacion fue exitosa' })
  success: boolean;

  @ApiProperty({ type: RefreshResponseDataDto, description: 'Datos de renovacion de sesion' })
  data: RefreshResponseDataDto;
}
