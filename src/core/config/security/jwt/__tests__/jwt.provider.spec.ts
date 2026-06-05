import { InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { JwtProvider } from '../jwt.provider';

const mockJwtService = {
  sign: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makePayload = () => ({
  userId: 'user-1',
  email: 'juan@example.com',
});

describe('JwtProvider', () => {
  let provider: JwtProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtProvider,
        { provide: JwtService, useValue: mockJwtService },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    provider = module.get<JwtProvider>(JwtProvider);
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('returns signed token string', () => {
      mockJwtService.sign.mockReturnValue('signed.jwt.token');
      const result = provider.generateToken(makePayload());
      expect(result).toBe('signed.jwt.token');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('logs info before signing', () => {
      mockJwtService.sign.mockReturnValue('token');
      provider.generateToken(makePayload());
      expect(mockLogger.info).toHaveBeenCalledWith('JwtProvider', 'Generating access token');
    });

    it('throws InternalServerErrorException when JwtService throws', () => {
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('signing failed');
      });
      expect(() => provider.generateToken(makePayload())).toThrow(InternalServerErrorException);
    });

    it('logs error when JwtService throws', () => {
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('signing failed');
      });
      try {
        provider.generateToken(makePayload());
      } catch {}
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });
});
