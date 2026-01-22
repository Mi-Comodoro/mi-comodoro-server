import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap, map } from 'rxjs';
import { LoggerProviderService } from '../providers/logger';
import { Response } from 'express';

interface SuccessResponse {
  success: boolean;
  data: object;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse> {
  constructor(private readonly logger: LoggerProviderService) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse> {
    const httpContext = context.switchToHttp();
    const res = httpContext.getResponse<Response>();
    const req = httpContext.getRequest();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ctx = context.getClass().name;
    const start = Date.now();

    return next.handle().pipe(
      map(
        (data): SuccessResponse => ({
          success: true,
          data: data as object,
        }),
      ),
      tap((response: SuccessResponse) => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const message = `Request completed - Status: ${status} [${duration}ms]`;

        this.logger.debug(ctx, message, method, url, response.data);
      }),
    );
  }
}
