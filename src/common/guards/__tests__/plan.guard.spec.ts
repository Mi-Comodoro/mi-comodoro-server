import { ForbiddenException } from '@nestjs/common';

import { AccountType } from '../../enums/account-type.enum';
import { PlanGuard } from '../plan.guard';

const makeReflector = (plans: AccountType[] | undefined) => ({
  getAllAndOverride: jest.fn().mockReturnValue(plans),
});

const makeContext = (user?: Record<string, unknown>) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
  getHandler: jest.fn(),
  getClass: jest.fn(),
});

describe('PlanGuard', () => {
  it('returns true when no plans required (no decorator)', () => {
    const guard = new PlanGuard(makeReflector(undefined) as never);
    expect(
      guard.canActivate(makeContext({ role: 'user', accountType: AccountType.TRIAL }) as never),
    ).toBe(true);
  });

  it('returns true when required plans array is empty', () => {
    const guard = new PlanGuard(makeReflector([]) as never);
    expect(
      guard.canActivate(makeContext({ role: 'user', accountType: AccountType.TRIAL }) as never),
    ).toBe(true);
  });

  it('returns true when no user on request', () => {
    const guard = new PlanGuard(makeReflector([AccountType.PRO]) as never);
    expect(guard.canActivate(makeContext(undefined) as never)).toBe(true);
  });

  it('returns true when user has ADMIN role (bypasses plan check)', () => {
    const guard = new PlanGuard(makeReflector([AccountType.PRO]) as never);
    expect(
      guard.canActivate(makeContext({ role: 'admin', accountType: AccountType.TRIAL }) as never),
    ).toBe(true);
  });

  it('returns true when user has SUPER_ADMIN role (bypasses plan check)', () => {
    const guard = new PlanGuard(makeReflector([AccountType.PRO]) as never);
    expect(
      guard.canActivate(
        makeContext({ role: 'super_admin', accountType: AccountType.TRIAL }) as never,
      ),
    ).toBe(true);
  });

  it('returns true when user accountType is included in required plans', () => {
    const guard = new PlanGuard(makeReflector([AccountType.PRO, AccountType.PLUS]) as never);
    expect(
      guard.canActivate(makeContext({ role: 'user', accountType: AccountType.PRO }) as never),
    ).toBe(true);
  });

  it('throws ForbiddenException when user accountType is not in required plans', () => {
    const guard = new PlanGuard(makeReflector([AccountType.PRO]) as never);
    expect(() =>
      guard.canActivate(makeContext({ role: 'user', accountType: AccountType.TRIAL }) as never),
    ).toThrow(ForbiddenException);
  });

  it('ForbiddenException message is PLAN_LIMIT_REACHED', () => {
    const guard = new PlanGuard(makeReflector([AccountType.PRO]) as never);
    try {
      guard.canActivate(makeContext({ role: 'user', accountType: AccountType.TRIAL }) as never);
    } catch (e) {
      expect((e as ForbiddenException).message).toBe('PLAN_LIMIT_REACHED');
    }
  });
});
