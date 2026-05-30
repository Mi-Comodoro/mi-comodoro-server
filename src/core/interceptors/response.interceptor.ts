import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { map, Observable, tap } from 'rxjs';

import { LoggerProviderService } from '../providers/logs';

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
      tap(() => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const message = `Request completed - Status: ${status} [${duration}ms]`;

        this.logger.debug(ctx, message, method, url);
      }),
    );
  }
}
