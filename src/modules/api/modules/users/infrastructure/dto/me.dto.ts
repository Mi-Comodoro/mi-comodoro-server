import { ApiProperty } from '@nestjs/swagger';

export class FinancesResponseDto {
  @ApiProperty({
    description: 'UUID del registro de finanzas',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    description: 'UUID del usuario propietario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Perfil financiero del usuario',
    example: 'employee',
  })
  profile: string;

  @ApiProperty({
    description: 'Tipo de uso de las finanzas',
    example: 'personal',
  })
  usage: string;

  @ApiProperty({
    description: 'Moneda del usuario',
    example: 'COP',
  })
  currency: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-03-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-03-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class UserProfileResponseDto {
  @ApiProperty({
    description: 'UUID de la cuenta',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  id: string;

  @ApiProperty({
    description: 'UUID del usuario propietario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Nombre para mostrar',
    example: 'John',
  })
  displayName: string;

  @ApiProperty({
    description: 'Número de teléfono',
    example: '0000000000',
  })
  phone: string;

  @ApiProperty({
    description: 'URL de la foto de perfil',
    example: 'https://example.com/avatar.jpg',
  })
  photo: string;

  @ApiProperty({
    description: 'Género del usuario',
    example: '',
    required: false,
  })
  gender: string;

  @ApiProperty({
    description: 'País del usuario',
    example: 'CO',
  })
  country: string;

  @ApiProperty({
    description: 'Tipo de cuenta',
    example: 'TRIAL',
  })
  type: string;

  @ApiProperty({
    description: 'Fecha de término de cuenta prueba',
    example: '2026-04-15T10:30:00.000Z',
  })
  trialEndsAt: Date;

  @ApiProperty({
    description: 'Indica si la cuenta está activa',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-03-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-03-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class MeResponseDto {
  @ApiProperty({
    description: 'UUID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Proveedor de autenticación',
    example: 'GOOGLE',
  })
  provider: string;

  @ApiProperty({
    description: 'Estado del onboarding',
    example: 'COMPLETED',
  })
  onboarding: string;

  @ApiProperty({
    description: 'Zona horaria del usuario',
    example: 'America/Bogota',
  })
  timezone: string;

  @ApiProperty({
    description: 'Datos de la cuenta del usuario',
    type: UserProfileResponseDto,
  })
  userProfile: UserProfileResponseDto;

  @ApiProperty({
    description: 'Datos financieros del usuario',
    type: FinancesResponseDto,
  })
  finances: FinancesResponseDto;
}

export class WrapperResponseMeDto {
  @ApiProperty({ type: 'boolean', example: true })
  success: boolean;
  @ApiProperty({
    description: 'Datos del usuario autenticado',
    type: MeResponseDto,
  })
  data: MeResponseDto;
}
