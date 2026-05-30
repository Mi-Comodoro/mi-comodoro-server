import type { RefreshTokenEntity } from '../infrastructure/database/entities/refresh-token.entity';

export interface RefreshTokenRepository {
  save(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
  }): Promise<RefreshTokenEntity>;
  findByHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  revokeById(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpiredBefore(date: Date): Promise<void>;
}
