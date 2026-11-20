import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestDeletionDto {
  @ApiProperty({
    example: 'ELIMINAR MI CUENTA',
    description: 'Frase de confirmación: la persona debe escribirla para entender lo que solicita',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  confirmation: string;
}
