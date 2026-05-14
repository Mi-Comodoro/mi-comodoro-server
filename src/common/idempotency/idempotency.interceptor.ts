import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { type Observable, of, tap } from 'rxjs';
import { Repository } from 'typeorm';

import { IdempotencyKey } from './idempotency-key.entity';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.method !== 'POST') return next.handle();

    const key = req.headers['x-idempotency-key'] as string | undefined;
    if (!key) return next.handle();

    const existing = await this.repo.findOne({ where: { key } });
    if (existing) return of(JSON.parse(existing.response) as unknown);

    return next.handle().pipe(
      tap(async (response: unknown) => {
        await this.repo.save({
          key,
          response: JSON.stringify(response),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }),
    );
  }
}
