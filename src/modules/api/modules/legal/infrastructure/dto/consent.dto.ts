import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AcceptConsentDto {
  @ApiProperty({
    example: '2.0',
    description: 'Versión de la Política de Tratamiento de Datos que se acepta',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  version: string;
}
