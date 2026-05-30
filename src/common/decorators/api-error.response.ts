import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { ErrorResponseDto } from '../infrastruture/http/dto/error.response.dto';
import { errorExample } from '../infrastruture/http/swagger/error-examples';

export const ApiErrorResponse = (status: HttpStatus, message: string) =>
  applyDecorators(
    ApiResponse({
      status,
      type: ErrorResponseDto,
      example: errorExample(message, status),
    }),
  );
