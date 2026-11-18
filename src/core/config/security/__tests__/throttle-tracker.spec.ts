import { JwtService } from '@nestjs/jwt';

import { resolveThrottleTracker } from '../throttle-tracker';

const SECRET = 'test-secret-for-throttle-tracker';

describe('resolveThrottleTracker', () => {
  const originalSecret = process.env.JWT_SECRET;
  const signer = new JwtService({ secret: SECRET });
  const tokenOf = (userId: string, options?: { expiresIn?: number }) =>
    signer.sign({ userId, email: 'x@example.com' }, { expiresIn: options?.expiresIn ?? 900 });

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });
  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  const req = (over: Record<string, unknown> = {}) => ({
    ip: '10.0.0.1',
    originalUrl: '/api/v1/budgets',
    headers: {},
    body: {},
    ...over,
  });

  it('cuenta por usuario cuando el JWT es válido, sin importar la IP', () => {
    const token = tokenOf('user-1');
    const a = resolveThrottleTracker(req({ headers: { authorization: `Bearer ${token}` } }));
    const b = resolveThrottleTracker(
      req({ ip: '10.0.0.99', headers: { authorization: `Bearer ${token}` } }),
    );
    expect(a).toBe('user:user-1');
    expect(b).toBe('user:user-1');
  });

  it('usuarios distintos desde la misma IP no comparten cupo', () => {
    const a = resolveThrottleTracker(
      req({ headers: { authorization: `Bearer ${tokenOf('user-1')}` } }),
    );
    const b = resolveThrottleTracker(
      req({ headers: { authorization: `Bearer ${tokenOf('user-2')}` } }),
    );
    expect(a).not.toBe(b);
  });

  it('un JWT inventado o con otra firma no sirve para esquivar el límite: cae a la IP', () => {
    const forged = new JwtService({ secret: 'otra-clave' }).sign({ userId: 'user-9' });
    expect(resolveThrottleTracker(req({ headers: { authorization: `Bearer ${forged}` } }))).toBe(
      'ip:10.0.0.1',
    );
    expect(resolveThrottleTracker(req({ headers: { authorization: 'Bearer basura' } }))).toBe(
      'ip:10.0.0.1',
    );
  });

  it('un JWT vencido cae a la IP', () => {
    const expired = signer.sign({ userId: 'user-1', email: 'x@example.com' }, { expiresIn: -10 });
    expect(resolveThrottleTracker(req({ headers: { authorization: `Bearer ${expired}` } }))).toBe(
      'ip:10.0.0.1',
    );
  });

  it('el inicio de sesión se cuenta por correo (sin distinguir mayúsculas)', () => {
    const a = resolveThrottleTracker(
      req({ originalUrl: '/api/v1/auth/signin', body: { email: 'Ana@Example.com ' } }),
    );
    const b = resolveThrottleTracker(
      req({
        ip: '10.0.0.7',
        originalUrl: '/api/v1/auth/signin',
        body: { email: 'ana@example.com' },
      }),
    );
    expect(a).toBe('email:ana@example.com');
    expect(b).toBe(a);
  });

  it('correos distintos en el login no comparten cupo', () => {
    const a = resolveThrottleTracker(
      req({ originalUrl: '/api/v1/auth/signin', body: { email: 'ana@example.com' } }),
    );
    const b = resolveThrottleTracker(
      req({ originalUrl: '/api/v1/auth/signin', body: { email: 'luis@example.com' } }),
    );
    expect(a).not.toBe(b);
  });

  it('el refresh se cuenta por sesión sin guardar el token en claro', () => {
    const tracker = resolveThrottleTracker(
      req({ originalUrl: '/api/v1/auth/refresh', body: { refreshToken: 'abc123' } }),
    );
    expect(tracker).toMatch(/^session:[0-9a-f]{32}$/);
    expect(tracker).not.toContain('abc123');
  });

  it('altas de cuenta (signup y google) se cuentan por IP aunque lleguen con correo', () => {
    expect(
      resolveThrottleTracker(
        req({ originalUrl: '/api/v1/auth/signup', body: { email: 'nuevo@example.com' } }),
      ),
    ).toBe('ip:10.0.0.1');
    expect(resolveThrottleTracker(req({ originalUrl: '/api/v1/auth/google?x=1' }))).toBe(
      'ip:10.0.0.1',
    );
  });

  it('sin identidad usa la IP, y la del socket si no hay req.ip', () => {
    expect(resolveThrottleTracker(req())).toBe('ip:10.0.0.1');
    expect(
      resolveThrottleTracker({ originalUrl: '/x', headers: {}, socket: { remoteAddress: '::1' } }),
    ).toBe('ip:::1');
    expect(resolveThrottleTracker({ headers: {} })).toBe('ip:unknown');
  });

  it('ignora valores que no son texto en el cuerpo', () => {
    expect(
      resolveThrottleTracker(
        req({ originalUrl: '/api/v1/auth/signin', body: { email: { $ne: null } } }),
      ),
    ).toBe('ip:10.0.0.1');
  });
});
