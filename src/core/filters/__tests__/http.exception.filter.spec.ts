import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { GlobalHttpExceptionFilter } from '../http.exception.filter';

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('GlobalHttpExceptionFilter', () => {
  let filter: GlobalHttpExceptionFilter;

  beforeEach(() => {
    filter = new GlobalHttpExceptionFilter(mockLogger as never);
    jest.clearAllMocks();
  });

  const callFilter = (exception: unknown) => {
    const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };
    filter.catch(exception, host as never);
    return mockResponse;
  };

  it('handles BadRequestException with status 400', () => {
    const res = callFilter(new BadRequestException('Invalid input'));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 400, error: 'BadRequest' }),
    );
  });

  it('handles UnauthorizedException with status 401', () => {
    const res = callFilter(new UnauthorizedException('Unauthorized'));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, error: 'Unauthorized' }),
    );
  });

  it('handles ForbiddenException with status 403', () => {
    const res = callFilter(new ForbiddenException('Forbidden'));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, error: 'Forbidden' }),
    );
  });

  it('handles NotFoundException with status 404', () => {
    const res = callFilter(new NotFoundException('Not found'));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, error: 'NotFound' }),
    );
  });

  it('handles ConflictException with status 409', () => {
    const res = callFilter(new ConflictException('Conflict'));
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'Conflict' }),
    );
  });

  it('handles InternalServerErrorException with status 500', () => {
    const res = callFilter(new InternalServerErrorException('Server error'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, error: 'InternalServerError' }),
    );
  });

  it('handles generic HttpException with derived error name', () => {
    class CustomHttpException extends HttpException {
      constructor() {
        super('Custom error', 418);
      }
    }
    const res = callFilter(new CustomHttpException());
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 418, error: 'CustomHttp' }),
    );
  });

  it('handles unknown exceptions with status 500 and logs error', () => {
    const res = callFilter(new Error('Unexpected'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 500 }),
    );
  });

  it('extracts array messages from BadRequestException (class-validator format)', () => {
    const exception = new BadRequestException({
      message: ['field is required', 'field must be string'],
    });
    const res = callFilter(exception);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'field is required, field must be string' }),
    );
  });

  it('response has success: false for all exceptions', () => {
    const res = callFilter(new NotFoundException('x'));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
