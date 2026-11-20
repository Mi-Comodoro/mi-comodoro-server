export interface UserConsent {
  id: string;
  userId: string;
  consentType: string;
  version: string;
  acceptedAt: Date;
  ip: string | null;
  userAgent: string | null;
  revokedAt: Date | null;
}

export interface ConsentContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface ConsentStatus {
  policyVersion: string;
  consentRequired: boolean;
  accepted: boolean;
  acceptedVersion: string | null;
  acceptedAt: Date | null;
  /** true si la aceptación es obligatoria y la persona aún no aceptó la versión vigente */
  needsAcceptance: boolean;
}
