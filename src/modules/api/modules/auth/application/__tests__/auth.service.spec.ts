import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AccountType } from '@/common/enums/account-type.enum';
import { JwtProvider } from '@/core/config/security/jwt/jwt.provider';
import { SystemConfigService } from '@/core/modules/system-config/system-config.service';
import { LoggerProviderService } from '@/core/providers';

import { UserRole } from '../../../users/domain/user-role.enum';
import { AuthService } from '../auth.service';

// ─── firebase-admin mock (prevents real SDK initialization) ──────────────────
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn().mockReturnValue({}) },
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
}));

// ─── argon2 mock (keeps tests fast) ──────────────────────────────────────────
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$mocked'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));

// ─── Stubs ────────────────────────────────────────────────────────────────────
const mockUserRepo = {
  findByEmail: jest.fn(),
  findAuthById: jest.fn(),
  save: jest.fn(),
  updatePassword: jest.fn(),
  invalidateTokens: jest.fn(),
};
const mockProfileRepo = { save: jest.fn() };
const mockRefreshTokenRepo = {
  save: jest.fn(),
  findByHash: jest.fn(),
  revokeById: jest.fn(),
  revokeAllForUser: jest.fn(),
};
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
const mockJwtProvider = { generateToken: jest.fn().mockReturnValue('signed-jwt-token') };
const mockJwtService = { decode: jest.fn().mockReturnValue({ exp: 9999999999 }) };
const mockSystemConfig = { getNumber: jest.fn().mockResolvedValue(14) };

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'user@test.com',
  password: '$argon2id$mocked',
  provider: 'LOCAL' as const,
  tokenVersion: 0,
  handle: null,
  role: UserRole.USER,
  userProfile: { id: 'profile-1', accountType: AccountType.TRIAL },
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: mockUserRepo },
        { provide: 'UserProfileRepository', useValue: mockProfileRepo },
        { provide: 'RefreshTokenRepository', useValue: mockRefreshTokenRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: JwtProvider, useValue: mockJwtProvider },
        { provide: JwtService, useValue: mockJwtService },
        { provide: SystemConfigService, useValue: mockSystemConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtProvider.generateToken.mockReturnValue('signed-jwt-token');
    mockJwtService.decode.mockReturnValue({ exp: 9999999999 });
    mockRefreshTokenRepo.save.mockResolvedValue({ id: 'rt-1' });
    mockSystemConfig.getNumber.mockResolvedValue(14);
  });

  // ─── signup ────────────────────────────────────────────────────────────────
  describe('signup', () => {
    const signupData = {
      email: 'new@test.com',
      name: 'Test User',
      passwordHash: '$argon2id$mocked',
      displayName: 'Tester',
    };

    it('throws ConflictException when email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());
      await expect(service.signup(signupData)).rejects.toThrow(ConflictException);
    });

    it('creates user and profile, returns token pair', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.save.mockResolvedValue(makeUser({ id: 'new-user-id', email: 'new@test.com' }));
      mockProfileRepo.save.mockResolvedValue({
        id: 'new-profile-id',
        accountType: AccountType.TRIAL,
        trialEndsAt: null,
      });

      const result = await service.signup(signupData);

      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
      expect(mockProfileRepo.save).toHaveBeenCalledTimes(1);
      expect(result.token).toBe('signed-jwt-token');
      expect(result.onboarding).toBe('PENDING');
    });

    it('uses TRIAL account type by default', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.save.mockResolvedValue(makeUser({ id: 'u-new' }));
      mockProfileRepo.save.mockResolvedValue({
        id: 'p-new',
        accountType: AccountType.TRIAL,
        trialEndsAt: new Date(),
      });

      const result = await service.signup(signupData);
      expect(result.accountType).toBe(AccountType.TRIAL);
    });

    it('creates a refresh token and returns expiresAt', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.save.mockResolvedValue(makeUser({ id: 'u-new' }));
      mockProfileRepo.save.mockResolvedValue({ id: 'p-new', accountType: AccountType.TRIAL });

      const result = await service.signup(signupData);
      expect(mockRefreshTokenRepo.save).toHaveBeenCalledTimes(1);
      expect(result.expiresAt).toBe(9999999999);
    });
  });

  // ─── signin ────────────────────────────────────────────────────────────────
  describe('signin', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      await expect(service.signin({ email: 'no@test.com', password: 'pass' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnauthorizedException when password is invalid', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());
      const { verify } = await import('argon2');
      (verify as jest.Mock).mockResolvedValue(false);

      await expect(service.signin({ email: 'user@test.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns token pair on valid credentials', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());
      const { verify } = await import('argon2');
      (verify as jest.Mock).mockResolvedValue(true);

      const result = await service.signin({ email: 'user@test.com', password: 'correct' });
      expect(result.token).toBe('signed-jwt-token');
    });

    it('rehashes the password when legacy (lowercase) match succeeds', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(makeUser());
      const { verify, hash } = await import('argon2');
      // first call (normal) fails, second call (lowercase) succeeds
      (verify as jest.Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockUserRepo.updatePassword.mockResolvedValue(undefined);
      (hash as jest.Mock).mockResolvedValue('$argon2id$new');

      await service.signin({ email: 'user@test.com', password: 'Correct' });

      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('user-1', '$argon2id$new');
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────
  describe('logout', () => {
    const jwtPayload = {
      userId: 'user-1',
      email: 'user@test.com',
      role: UserRole.USER,
      tokenVersion: 0,
    };

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepo.findAuthById.mockResolvedValue(null);
      await expect(service.logout(jwtPayload as never)).rejects.toThrow(NotFoundException);
    });

    it('invalidates tokens and revokes all refresh tokens', async () => {
      mockUserRepo.findAuthById.mockResolvedValue(makeUser());
      mockUserRepo.invalidateTokens.mockResolvedValue(undefined);
      mockRefreshTokenRepo.revokeAllForUser.mockResolvedValue(undefined);

      const result = await service.logout(jwtPayload as never);

      expect(mockUserRepo.invalidateTokens).toHaveBeenCalledWith('user-1', 0);
      expect(mockRefreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith('user-1');
      expect(result.message).toBe('Logout successful');
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────
  describe('refresh', () => {
    it('throws UnauthorizedException when refresh token is not found', async () => {
      mockRefreshTokenRepo.findByHash.mockResolvedValue(null);
      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token is expired', async () => {
      mockRefreshTokenRepo.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockRefreshTokenRepo.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockRefreshTokenRepo.revokeById.mockResolvedValue(undefined);
      mockUserRepo.findAuthById.mockResolvedValue(null);

      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new token pair on valid refresh token', async () => {
      mockRefreshTokenRepo.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockRefreshTokenRepo.revokeById.mockResolvedValue(undefined);
      mockUserRepo.findAuthById.mockResolvedValue(makeUser());

      const result = await service.refresh('raw-token');
      expect(result.token).toBe('signed-jwt-token');
      expect(mockRefreshTokenRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
