import { InitialSchema20260610000000 } from './migrations/20260610000000-InitialSchema';
import { SeedCategories20260610000001 } from './migrations/20260610000001-SeedCategories';
import { SeedPlans20260610000002 } from './migrations/20260610000002-SeedPlans';
import { AddCustomBucketsToBudget20260610000003 } from './migrations/20260610000003-AddCustomBucketsToBudget';
import { AddCustomBucketIdToPlannedExpense20260610000004 } from './migrations/20260610000004-AddCustomBucketIdToPlannedExpense';
import { AddTimezoneToUsers20260610000005 } from './migrations/20260610000005-AddTimezoneToUsers';
import { AddUserConsents20260610000006 } from './migrations/20260610000006-AddUserConsents';
import { AddAccountDeletion20260610000007 } from './migrations/20260610000007-AddAccountDeletion';

/**
 * Migraciones que la aplicación aplica al arrancar (cuando migrationsRun está activo).
 * Una migración nueva debe agregarse aquí: migrations.registry.spec.ts falla si algún archivo de
 * src/database/migrations no está registrado (antes AddTimezoneToUsers se había quedado fuera).
 */
export const MIGRATIONS = [
  InitialSchema20260610000000,
  SeedCategories20260610000001,
  SeedPlans20260610000002,
  AddCustomBucketsToBudget20260610000003,
  AddCustomBucketIdToPlannedExpense20260610000004,
  AddTimezoneToUsers20260610000005,
  AddUserConsents20260610000006,
  AddAccountDeletion20260610000007,
];
