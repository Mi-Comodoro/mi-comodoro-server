import type { BetaAccessRequest, BetaAccessStatus } from '../beta-access-request';

export interface BetaAccessRepository {
  create(data: { email: string; policyVersion: string }): Promise<BetaAccessRequest>;
  findById(id: string): Promise<BetaAccessRequest | null>;
  findByEmail(email: string): Promise<BetaAccessRequest | null>;
  findByTokenHash(hash: string): Promise<BetaAccessRequest | null>;
  list(status?: BetaAccessStatus): Promise<BetaAccessRequest[]>;
  update(id: string, patch: Partial<Omit<BetaAccessRequest, 'id' | 'createdAt'>>): Promise<void>;
  countByStatus(statuses: BetaAccessStatus[]): Promise<number>;
  /** Borra por retención y devuelve cuántas filas salieron. */
  deleteRejectedBefore(date: Date): Promise<number>;
  deletePendingBefore(date: Date): Promise<number>;
  deleteApprovedExpiredBefore(date: Date): Promise<number>;
}
