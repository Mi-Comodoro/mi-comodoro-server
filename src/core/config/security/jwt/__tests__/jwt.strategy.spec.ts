import { UnauthorizedException } from '@nestjs/common';

import { UserRepository } from '@/modules/api/modules/users/domain/user.repository';

import { JwtStrategy } from '../jwt.strategy';

describe('JwtStrategy', () => {
  const userRepository = { findAuthById: jest.fn() } as unknown as jest.Mocked<UserRepository>;
  const originalSecret = process.env.JWT_SECRET;
  let strategy: JwtStrategy;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(userRepository);
  });

  it('rechaza tokens de WebSocket como token de acceso a la API', async () => {
    await expect(
      strategy.validate({ userId: 'u1', email: 'a@b.c', tokenVersion: 0, typ: 'ws' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(userRepository.findAuthById).not.toHaveBeenCalled();
  });

  it('acepta un access token vigente', async () => {
    userRepository.findAuthById.mockResolvedValue({ id: 'u1', tokenVersion: 1 } as never);
    const result = await strategy.validate({ userId: 'u1', email: 'a@b.c', tokenVersion: 1 });
    expect(result.userId).toBe('u1');
  });

  it('rechaza un access token con tokenVersion obsoleto', async () => {
    userRepository.findAuthById.mockResolvedValue({ id: 'u1', tokenVersion: 2 } as never);
    await expect(
      strategy.validate({ userId: 'u1', email: 'a@b.c', tokenVersion: 1 }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
