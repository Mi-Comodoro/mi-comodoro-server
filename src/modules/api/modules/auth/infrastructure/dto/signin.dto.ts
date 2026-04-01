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
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ZTI1YmRjOS0wZGFmLTQ5MzgtYWNjZC04MWZlNWJjNWEwZGMiLCJlbWFpbCI6InVzZXIzQGVtYWlsLmNvbSIsInVzZXJQcm9maWxlSWQiOiI5NGExYTdiZC1kZjExLTRjZjAtYjA4Yy1lYWE3YmQ1MzExMTciLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc2OTM2MzkxNywiZXhwIjoxNzY5MzY3NTE3fQ.VwtqZeTRFho4rg05EG1wab8lB22muZ2ch0OrZX4P6Ug',
    description: 'JWT generado para autenticacion',
  })
  token: string;

  @ApiProperty({ example: 'TRIAL', description: 'Tipo de cuenta del usuario' })
  accountType: string;

  @ApiProperty({
    example: 1775097600,
    description: 'Fecha de expiracion del token en unix timestamp (segundos)',
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

export class RefreshResponseDataDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ZTI1YmRjOS0wZGFmLTQ5MzgtYWNjZC04MWZlNWJjNWEwZGMiLCJlbWFpbCI6InVzZXIzQGVtYWlsLmNvbSIsInVzZXJQcm9maWxlSWQiOiI5NGExYTdiZC1kZjExLTRjZjAtYjA4Yy1lYWE3YmQ1MzExMTciLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc2OTM2MzkxNywiZXhwIjoxNzY5MzY3NTE3fQ.VwtqZeTRFho4rg05EG1wab8lB22muZ2ch0OrZX4P6Ug',
    description: 'JWT renovado para autenticacion',
  })
  token: string;

  @ApiProperty({
    example: 1775097600,
    description: 'Fecha de expiracion del token en unix timestamp (segundos)',
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
