export type BetaAccessStatus = 'pending' | 'approved' | 'rejected' | 'registered';

export interface BetaAccessRequest {
  id: string;
  /** Se borra cuando la persona se registra: la cuenta ya guarda su correo. */
  email: string | null;
  status: BetaAccessStatus;
  policyVersion: string;
  consentAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
  inviteTokenHash: string | null;
  inviteExpiresAt: Date | null;
  registeredUserId: string | null;
  registeredAt: Date | null;
  createdAt: Date;
}

/** Lo que ve el admin: nunca incluye el hash de la invitación. */
export type BetaAccessRequestView = Omit<BetaAccessRequest, 'inviteTokenHash'>;
