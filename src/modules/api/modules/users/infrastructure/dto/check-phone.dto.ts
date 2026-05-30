import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CheckPhoneQueryDto {
  @ApiProperty({ example: '+573001234567', description: 'Número en formato internacional E.164' })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @IsString()
  @Matches(/^\+\d{7,15}$/, {
    message: 'El teléfono debe estar en formato internacional. Ej: +573001234567',
  })
  phone: string;
}

export class CheckPhoneResponseDto {
  @ApiProperty({ example: true, description: 'true si el número está disponible', required: true })
  available: boolean;
}
