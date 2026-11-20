/**
 * Versión vigente de la Política de Tratamiento de Datos y si la aceptación es obligatoria.
 *
 * LEGAL_CONSENT_REQUIRED permanece en false hasta que se publique la política v2 en /privacy y se active
 * la casilla en el frontend (publicar ambas a la vez, para que la autorización apunte a un texto
 * verdadero). Mientras tanto el código graba la evidencia si llega, pero no exige nada.
 */
export const CONSENT_TYPE_POLICY = 'privacy_policy' as const;

export interface LegalConfig {
  policyVersion: string;
  consentRequired: boolean;
}

export const getLegalConfig = (
  env: Record<string, string | undefined> = process.env,
): LegalConfig => ({
  policyVersion: env.LEGAL_POLICY_VERSION?.trim() || '2.0',
  consentRequired: ['true', '1', 'yes'].includes(
    (env.LEGAL_CONSENT_REQUIRED ?? '').trim().toLowerCase(),
  ),
});
