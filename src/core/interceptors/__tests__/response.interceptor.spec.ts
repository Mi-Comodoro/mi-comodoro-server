import { lastValueFrom, of } from 'rxjs';

import { ResponseInterceptor } from '../response.interceptor';

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeContext = () => ({
  switchToHttp: () => ({
    getRequest: () => ({ method: 'GET', originalUrl: '/api/test' }),
    getResponse: () => ({ statusCode: 200 }),
  }),
  getClass: () => ({ name: 'TestController' }),
});

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor(mockLogger as never);
    jest.clearAllMocks();
  });

  it('wraps response data with success: true', async () => {
    const next = { handle: () => of({ id: 1, name: 'Test' }) };
    const result$ = interceptor.intercept(makeContext() as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ success: true, data: { id: 1, name: 'Test' } });
  });

  it('wraps null data with success: true', async () => {
    const next = { handle: () => of(null) };
    const result$ = interceptor.intercept(makeContext() as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ success: true, data: null });
  });

  it('wraps array data with success: true', async () => {
    const next = { handle: () => of([1, 2, 3]) };
    const result$ = interceptor.intercept(makeContext() as never, next);
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ success: true, data: [1, 2, 3] });
  });

  it('calls logger.debug after request completes', async () => {
    const next = { handle: () => of({ ok: true }) };
    const result$ = interceptor.intercept(makeContext() as never, next);
    await lastValueFrom(result$);
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
  });

  it('uses req.url as fallback when originalUrl is not set', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/fallback' }),
        getResponse: () => ({ statusCode: 201 }),
      }),
      getClass: () => ({ name: 'TestController' }),
    };
    const next = { handle: () => of({}) };
    const result$ = interceptor.intercept(ctx as never, next);
    await lastValueFrom(result$);
    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
