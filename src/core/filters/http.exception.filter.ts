import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let message = 'Internal Server Error';
    let error = 'InternalServerError';

    // === HTTP EXCEPTIONS ===
    if (exception instanceof BadRequestException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
      error = 'BadRequest';
    } else if (exception instanceof UnauthorizedException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
      error = 'Unauthorized';
    } else if (exception instanceof ForbiddenException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
      error = 'Forbidden';
    } else if (exception instanceof NotFoundException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
      error = 'NotFound';
    } else if (exception instanceof ConflictException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
      error = 'Conflict';
    } else if (exception instanceof InternalServerErrorException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
      error = 'InternalServerError';
    } else if (exception instanceof HttpException) {
      // fallback para otros HttpException
      status = exception.getStatus();
      message = this.extractMessage(exception);
      error = this.getExceptionName(exception);
    } else {
      // === UNKNOWN ERROR (throw new Error(), errores JS, errores de libs, etc) ===
      console.error('Unhandled exception:', exception);
    }

    const json: ErrorResponse = {
      success: false,
      message,
      error,
      statusCode: status,
    };

    response.status(status).json(json);
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const msg = response.message;
      if (Array.isArray(msg)) return msg.join(', ');
      if (typeof msg === 'string') return msg;
    }

    return exception.message;
  }

  private getExceptionName(exception: HttpException): string {
    return exception.constructor.name.replace('Exception', '');
  }
}
