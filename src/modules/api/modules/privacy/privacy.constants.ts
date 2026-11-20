/** Usuario «Persona eliminada»: recibe los registros compartidos de las cuentas eliminadas. */
export const DELETED_USER_ID = '00000000-0000-4000-8000-000000000000';

/** Frase que la persona debe escribir para confirmar que entiende lo que pide. */
export const DELETION_CONFIRMATION_PHRASE = 'ELIMINAR MI CUENTA';

/** Días que los datos permanecen en el sistema antes del borrado permanente. */
export const DEFAULT_RETENTION_DAYS = 90;

export const getRetentionDays = (env: Record<string, string | undefined> = process.env): number => {
  const parsed = Number.parseInt(env.ACCOUNT_DELETION_RETENTION_DAYS ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365 ? parsed : DEFAULT_RETENTION_DAYS;
};
