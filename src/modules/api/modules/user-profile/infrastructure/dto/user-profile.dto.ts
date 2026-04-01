import { ApiResponseProperty } from '@nestjs/swagger';

import { GenderType } from '../../domain/user-profile.types';

class ResponseData {
  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: 'a1d959d0-9260-4e62-adb5-8a615b95e819',
  })
  id: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'uuid',
    example: '2ea989cb-6286-42ff-82a2-fa7ca6da6d26',
  })
  userId: string;

  @ApiResponseProperty({ type: 'string', example: 'John Doe' })
  name: string;

  @ApiResponseProperty({ type: 'string', example: 'John' })
  displayName?: string;

  @ApiResponseProperty({ example: 'MALE' })
  gender?: GenderType;

  @ApiResponseProperty({ type: 'string', example: 'CO' })
  country?: string;

  @ApiResponseProperty({ type: 'string', example: 'TRIAL' })
  type: string;

  @ApiResponseProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-02-08T15:38:12.774Z',
  })
  trialEndsAt?: string;

  @ApiResponseProperty({ type: 'boolean', example: true })
  isActive: boolean;

  @ApiResponseProperty({ type: 'string', format: 'date-time', example: '2026-01-25T15:38:12.778Z' })
  createdAt: string;

  @ApiResponseProperty({ type: 'string', format: 'date-time', example: '2026-01-25T15:38:12.778Z' })
  updatedAt: string;
}

export class UserProfileResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: true })
  success: boolean;

  @ApiResponseProperty({ type: ResponseData })
  data: ResponseData;
}
