import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';

import type { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import { RefreshTokenEntity } from '../database/entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>,
  ) {}

  async save(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
  }): Promise<RefreshTokenEntity> {
    const entity = this.repo.create({
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      userAgent: data.userAgent ?? null,
    });
    return this.repo.save(entity);
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repo.findOne({ where: { tokenHash, revokedAt: IsNull() } });
  }

  async revokeById(id: string): Promise<void> {
    await this.repo.update(id, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async deleteExpiredBefore(date: Date): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(date) });
  }
}
