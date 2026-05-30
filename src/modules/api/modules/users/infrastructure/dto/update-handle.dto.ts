import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateHandleDto {
  @ApiProperty({
    example: 'miguel_dev',
    description: 'Handle único del usuario (3-20 caracteres, solo letras, números y guiones bajos)',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'El handle solo puede contener letras minúsculas, números y guiones bajos',
  })
  handle: string;
}
