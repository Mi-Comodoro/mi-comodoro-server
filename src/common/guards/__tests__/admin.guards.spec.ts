import { ForbiddenException } from '@nestjs/common';

import { AdminGuard } from '../admin.guard';
import { SuperAdminGuard } from '../super-admin.guard';

const makeContext = (role?: string) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user: role ? { role } : undefined }),
  }),
});

// ─── AdminGuard ────────────────────────────────────────────────────────────────
describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('returns true when role is admin', () => {
    expect(guard.canActivate(makeContext('admin') as never)).toBe(true);
  });

  it('returns true when role is super_admin', () => {
    expect(guard.canActivate(makeContext('super_admin') as never)).toBe(true);
  });

  it('throws ForbiddenException when role is user', () => {
    expect(() => guard.canActivate(makeContext('user') as never)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when no user on request', () => {
    expect(() => guard.canActivate(makeContext() as never)).toThrow(ForbiddenException);
  });
});

// ─── SuperAdminGuard ───────────────────────────────────────────────────────────
describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  it('returns true when role is super_admin', () => {
    expect(guard.canActivate(makeContext('super_admin') as never)).toBe(true);
  });

  it('throws ForbiddenException when role is admin', () => {
    expect(() => guard.canActivate(makeContext('admin') as never)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when role is user', () => {
    expect(() => guard.canActivate(makeContext('user') as never)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when no user on request', () => {
    expect(() => guard.canActivate(makeContext() as never)).toThrow(ForbiddenException);
  });
});
