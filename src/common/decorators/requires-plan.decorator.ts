import { SetMetadata } from '@nestjs/common';

import type { AccountType } from '../enums/account-type.enum';

export const PLAN_KEY = 'requiredPlans';
export const RequiresPlan = (...plans: AccountType[]) => SetMetadata(PLAN_KEY, plans);
