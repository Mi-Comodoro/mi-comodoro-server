import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SearchUsersQueryDto {
  @ApiProperty({ example: 'miguel', description: 'Término de búsqueda (handle parcial)' })
  @IsString()
  @MinLength(2)
  q: string;
}

export class SearchUserResultDto {
  @ApiProperty() id: string;
  @ApiProperty() handle: string;
  @ApiProperty() displayName: string;
  @ApiProperty({ required: false }) photo?: string;
}
