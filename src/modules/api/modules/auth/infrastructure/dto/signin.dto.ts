import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

import { PASSWORD_REGEX } from '@/common/constants';

export class SignInDto {
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
}

export class SignInResponseDataDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ZTI1YmRjOS0wZGFmLTQ5MzgtYWNjZC04MWZlNWJjNWEwZGMiLCJlbWFpbCI6InVzZXIzQGVtYWlsLmNvbSIsImFjY291bnRJZCI6Ijk0YTFhN2JkLWRmMTEtNGNmMC1iMDhjLWVhYTdiZDUzMTExNyIsImlhdCI6MTc2OTM2MzkxNywiZXhwIjoxNzY5MzY3NTE3fQ.VwtqZeTRFho4rg05EG1wab8lB22muZ2ch0OrZX4P6Ug',
    description: 'JWT generado para autenticación',
  })
  token: string;

  @ApiProperty({ example: true, description: 'Indica si el usuario está activo' })
  active: boolean;

  @ApiProperty({ example: 'TRIAL', description: 'Tipo de cuenta del usuario' })
  accountType: string;
}

export class SignInResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ type: SignInResponseDataDto, description: 'Datos de la sesión del usuario' })
  data: SignInResponseDataDto;
}
