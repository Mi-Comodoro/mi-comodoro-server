import { UserRole } from '@/modules/api/modules/users/domain/user-role.enum';

import { RolesGuard } from '../roles.guard';

const makeReflector = (roles: UserRole[] | null) => ({
  getAllAndOverride: jest.fn().mockReturnValue(roles),
});

const makeContext = (role?: UserRole) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user: role ? { role } : undefined }),
  }),
  getHandler: jest.fn(),
  getClass: jest.fn(),
});

describe('RolesGuard', () => {
  it('returns true when no roles are required', () => {
    const guard = new RolesGuard(makeReflector(null) as never);
    expect(guard.canActivate(makeContext(UserRole.USER) as never)).toBe(true);
  });

  it('returns true when required roles array is empty', () => {
    const guard = new RolesGuard(makeReflector([]) as never);
    expect(guard.canActivate(makeContext(UserRole.USER) as never)).toBe(true);
  });

  it('returns true when user has one of the required roles', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]) as never);
    expect(guard.canActivate(makeContext(UserRole.ADMIN) as never)).toBe(true);
  });

  it('returns false when user does not have any required role', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]) as never);
    expect(guard.canActivate(makeContext(UserRole.USER) as never)).toBe(false);
  });

  it('returns false when no user on request', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]) as never);
    expect(guard.canActivate(makeContext() as never)).toBe(false);
  });

  it('returns true when user has one of multiple required roles', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN, UserRole.SUPER_ADMIN]) as never);
    expect(guard.canActivate(makeContext(UserRole.SUPER_ADMIN) as never)).toBe(true);
  });
});
