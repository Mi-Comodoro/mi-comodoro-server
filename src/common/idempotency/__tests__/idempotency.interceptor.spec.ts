import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { lastValueFrom, of } from 'rxjs';

import { IdempotencyInterceptor } from '../idempotency.interceptor';
import { IdempotencyKey } from '../idempotency-key.entity';

const mockRepo = { findOne: jest.fn(), save: jest.fn() };

const makeContext = (method: string, key?: string) => ({
  switchToHttp: () => ({
    getRequest: () => ({
      method,
      headers: key ? { 'x-idempotency-key': key } : {},
    }),
  }),
});

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: getRepositoryToken(IdempotencyKey), useValue: mockRepo },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    jest.clearAllMocks();
  });

  it('passes through non-POST requests without checking idempotency key', async () => {
    const next = { handle: jest.fn().mockReturnValue(of({ data: 'get-response' })) };
    const result$ = await interceptor.intercept(makeContext('GET') as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ data: 'get-response' });
    expect(mockRepo.findOne).not.toHaveBeenCalled();
  });

  it('passes through POST requests without idempotency key header', async () => {
    const next = { handle: jest.fn().mockReturnValue(of({ id: 1 })) };
    const result$ = await interceptor.intercept(makeContext('POST') as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ id: 1 });
    expect(mockRepo.findOne).not.toHaveBeenCalled();
  });

  it('returns cached response when idempotency key already exists', async () => {
    const cached = { key: 'key-123', response: JSON.stringify({ id: 99 }) };
    mockRepo.findOne.mockResolvedValue(cached);
    const next = { handle: jest.fn() };
    const result$ = await interceptor.intercept(makeContext('POST', 'key-123') as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ id: 99 });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('saves response when processing a new idempotency key', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue(undefined);
    const next = { handle: jest.fn().mockReturnValue(of({ created: true })) };
    const result$ = await interceptor.intercept(makeContext('POST', 'new-key') as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ created: true });
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'new-key', response: JSON.stringify({ created: true }) }),
    );
  });
});
