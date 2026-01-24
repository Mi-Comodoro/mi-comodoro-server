import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { LoggerProviderService } from '../providers/logs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerProviderService) {}

  intercept<T>(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    const ctx = context.getClass().name;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const status = context.switchToHttp().getResponse().statusCode;
        const message = `Request completed - Status: ${status} [${duration}ms]`;
        this.logger.info(ctx, message, method, url);
      }),
    );
  }
}
