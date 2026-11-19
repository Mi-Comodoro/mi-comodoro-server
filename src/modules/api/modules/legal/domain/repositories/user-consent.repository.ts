import { UserConsent } from '../user-consent';

export interface UserConsentRepository {
  save(data: Omit<UserConsent, 'id' | 'acceptedAt' | 'revokedAt'>): Promise<UserConsent>;
  /** Último consentimiento vigente (no revocado) de ese tipo */
  findLatest(userId: string, consentType: string): Promise<UserConsent | null>;
}
