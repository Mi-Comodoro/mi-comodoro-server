/**
 * Beta cerrada: el registro exige una invitación aprobada por un admin.
 *
 * BETA_INVITE_REQUIRED permanece en false hasta que el dashboard y la landing estén desplegados; con el
 * interruptor apagado el registro funciona como siempre (y si llega una invitación válida igual se
 * marca como usada).
 */
export interface BetaAccessConfig {
  inviteRequired: boolean;
}

export const getBetaAccessConfig = (
  env: Record<string, string | undefined> = process.env,
): BetaAccessConfig => ({
  inviteRequired: ['true', '1', 'yes'].includes(
    (env.BETA_INVITE_REQUIRED ?? '').trim().toLowerCase(),
  ),
});

/** Claves de la configuración del sistema (editables desde Admin > Configuración, sin desplegar). */
export const CONFIG_MAX_USERS = 'beta_max_users';
export const CONFIG_INVITE_DAYS = 'beta_invite_days';
export const DEFAULT_MAX_USERS = 10;
export const DEFAULT_INVITE_DAYS = 14;

/**
 * Retención de las solicitudes (datos mínimos y con una sola finalidad: gestionar el acceso a la beta).
 * Pendientes sin respuesta: 12 meses. Rechazadas: 30 días. Invitaciones vencidas sin usar: 30 días.
 */
export const RETENTION_DAYS = {
  pending: 365,
  rejected: 30,
  expiredInvite: 30,
} as const;
