import { LoggerProviderService } from '../logger.provider.service';

describe('LoggerProviderService', () => {
  let service: LoggerProviderService;
  let innerLogger: Record<string, jest.Mock>;

  beforeEach(() => {
    service = new LoggerProviderService();
    innerLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    (service as unknown as Record<string, unknown>).logger = innerLogger;
  });

  describe('info', () => {
    it('calls logger.log with just the message when no method or path', () => {
      service.info('Context', 'test message');
      expect(innerLogger.log).toHaveBeenCalledWith('test message', 'Context');
    });

    it('prepends method and path when both provided', () => {
      service.info('Context', 'test message', 'GET', '/api/test');
      expect(innerLogger.log).toHaveBeenCalledWith('GET /api/test | test message', 'Context');
    });

    it('prepends method only when no path provided', () => {
      service.info('Context', 'test message', 'POST');
      expect(innerLogger.log).toHaveBeenCalledWith('POST | test message', 'Context');
    });

    it('appends JSON-stringified data when provided', () => {
      service.info('Context', 'msg', null, undefined, { key: 'value' });
      expect(innerLogger.log).toHaveBeenCalledWith('msg | {"key":"value"}', 'Context');
    });

    it('skips method prefix when method is null', () => {
      service.info('Context', 'msg', null);
      expect(innerLogger.log).toHaveBeenCalledWith('msg', 'Context');
    });
  });

  describe('warn', () => {
    it('calls logger.warn with formatted message', () => {
      service.warn('Context', 'warning message');
      expect(innerLogger.warn).toHaveBeenCalledWith('warning message', 'Context');
    });

    it('includes method and path in warning', () => {
      service.warn('Context', 'warning', 'DELETE', '/item/1');
      expect(innerLogger.warn).toHaveBeenCalledWith('DELETE /item/1 | warning', 'Context');
    });
  });

  describe('error', () => {
    it('calls logger.error with formatted message', () => {
      service.error('Context', 'error message', 'stack trace');
      expect(innerLogger.error).toHaveBeenCalledWith('error message', 'stack trace', 'Context');
    });

    it('includes method and path in error', () => {
      service.error('Context', 'error', undefined, 'GET', '/path');
      expect(innerLogger.error).toHaveBeenCalledWith('GET /path | error', undefined, 'Context');
    });
  });

  describe('debug', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('calls logger.debug in non-production environment', () => {
      process.env.NODE_ENV = 'development';
      service.debug('Context', 'debug message');
      expect(innerLogger.debug).toHaveBeenCalledWith('debug message', 'Context');
    });

    it('does not call logger.debug in production environment', () => {
      process.env.NODE_ENV = 'production';
      service.debug('Context', 'debug message');
      expect(innerLogger.debug).not.toHaveBeenCalled();
    });

    it('includes method and path in debug message', () => {
      process.env.NODE_ENV = 'test';
      service.debug('Context', 'debug', 'PATCH', '/resource');
      expect(innerLogger.debug).toHaveBeenCalledWith('PATCH /resource | debug', 'Context');
    });
  });
});
