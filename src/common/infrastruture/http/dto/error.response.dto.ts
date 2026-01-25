import { ApiResponseProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiResponseProperty({ type: 'boolean', example: false })
  success: boolean;
  @ApiResponseProperty({ type: 'string' })
  message: string;
  @ApiResponseProperty({ type: 'string' })
  error: string;
  @ApiResponseProperty({ type: 'number' })
  statusCode: number;
}
