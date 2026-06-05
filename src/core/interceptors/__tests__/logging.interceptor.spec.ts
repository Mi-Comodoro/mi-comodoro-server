import { lastValueFrom, of } from 'rxjs';

import { LoggingInterceptor } from '../logging.interceptor';

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeContext = (overrides: { method?: string; url?: string; statusCode?: number } = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({ method: overrides.method ?? 'GET', url: overrides.url ?? '/api/test' }),
    getResponse: () => ({ statusCode: overrides.statusCode ?? 200 }),
  }),
  getClass: () => ({ name: 'TestController' }),
});

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor(mockLogger as never);
    jest.clearAllMocks();
  });

  it('passes through the response value unchanged', async () => {
    const next = { handle: () => of({ id: 1 }) };
    const result$ = interceptor.intercept(makeContext() as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ id: 1 });
  });

  it('calls logger.info after request completes', async () => {
    const next = { handle: () => of({}) };
    const result$ = interceptor.intercept(makeContext() as never, next);
    await lastValueFrom(result$);
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });

  it('logs correct method and url', async () => {
    const next = { handle: () => of(null) };
    const ctx = makeContext({ method: 'POST', url: '/api/budgets', statusCode: 201 });
    const result$ = interceptor.intercept(ctx as never, next);
    await lastValueFrom(result$);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'TestController',
      expect.stringContaining('Status: 201'),
      'POST',
      '/api/budgets',
    );
  });

  it('logs message containing duration in ms', async () => {
    const next = { handle: () => of(null) };
    const result$ = interceptor.intercept(makeContext() as never, next);
    await lastValueFrom(result$);
    const [, message] = mockLogger.info.mock.calls[0];
    expect(message).toMatch(/\[\d+ms\]/);
  });
});
