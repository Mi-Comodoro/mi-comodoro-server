import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';

import type { BetaAccessRequest, BetaAccessStatus } from '../../domain/beta-access-request';
import type { BetaAccessRepository } from '../../domain/repositories/beta-access.repository';
import { BetaAccessRequestEntity } from '../database/entities/beta-access-request.entity';

const toDomain = (e: BetaAccessRequestEntity): BetaAccessRequest => ({
  id: e.id,
  email: e.email,
  status: e.status,
  policyVersion: e.policyVersion,
  consentAt: e.consentAt,
  decidedBy: e.decidedBy,
  decidedAt: e.decidedAt,
  inviteTokenHash: e.inviteTokenHash,
  inviteExpiresAt: e.inviteExpiresAt,
  registeredUserId: e.registeredUserId,
  registeredAt: e.registeredAt,
  createdAt: e.createdAt,
});

@Injectable()
export class BetaAccessRepositoryImpl implements BetaAccessRepository {
  constructor(
    @InjectRepository(BetaAccessRequestEntity)
    private readonly repository: Repository<BetaAccessRequestEntity>,
  ) {}

  async create(data: { email: string; policyVersion: string }): Promise<BetaAccessRequest> {
    const saved = await this.repository.save(this.repository.create(data));
    // consent_at lo pone la base de datos: se vuelve a leer la fila
    return toDomain(await this.repository.findOneByOrFail({ id: saved.id }));
  }

  async findById(id: string): Promise<BetaAccessRequest | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<BetaAccessRequest | null> {
    const entity = await this.repository
      .createQueryBuilder('r')
      .where('lower(r.email) = lower(:email)', { email })
      .getOne();
    return entity ? toDomain(entity) : null;
  }

  async findByTokenHash(hash: string): Promise<BetaAccessRequest | null> {
    const entity = await this.repository.findOne({ where: { inviteTokenHash: hash } });
    return entity ? toDomain(entity) : null;
  }

  async list(status?: BetaAccessStatus): Promise<BetaAccessRequest[]> {
    const entities = await this.repository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return entities.map(toDomain);
  }

  async update(
    id: string,
    patch: Partial<Omit<BetaAccessRequest, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await this.repository.update({ id }, patch);
  }

  async countByStatus(statuses: BetaAccessStatus[]): Promise<number> {
    return await this.repository.count({ where: { status: In(statuses) } });
  }

  async deleteRejectedBefore(date: Date): Promise<number> {
    const result = await this.repository.delete({ status: 'rejected', decidedAt: LessThan(date) });
    return result.affected ?? 0;
  }

  async deletePendingBefore(date: Date): Promise<number> {
    const result = await this.repository.delete({ status: 'pending', createdAt: LessThan(date) });
    return result.affected ?? 0;
  }

  async deleteApprovedExpiredBefore(date: Date): Promise<number> {
    const result = await this.repository.delete({
      status: 'approved',
      inviteExpiresAt: LessThan(date),
    });
    return result.affected ?? 0;
  }
}
