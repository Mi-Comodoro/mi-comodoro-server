import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({
    example: 'miguel_dev',
    description: 'Handle del usuario al que se envía la solicitud',
  })
  @IsString()
  handle: string;
}

export class FriendshipIdParamDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  id: string;
}
