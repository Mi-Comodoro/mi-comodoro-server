import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { UserConsentRepository } from '../../domain/repositories/user-consent.repository';
import { UserConsent } from '../../domain/user-consent';
import { UserConsentEntity } from '../database/entities/user-consent.entity';

const toDomain = (entity: UserConsentEntity): UserConsent => ({
  id: entity.id,
  userId: entity.userId,
  consentType: entity.consentType,
  version: entity.version,
  acceptedAt: entity.acceptedAt,
  ip: entity.ip,
  userAgent: entity.userAgent,
  revokedAt: entity.revokedAt,
});

@Injectable()
export class UserConsentRepositoryImpl implements UserConsentRepository {
  constructor(
    @InjectRepository(UserConsentEntity)
    private readonly repository: Repository<UserConsentEntity>,
  ) {}

  async save(data: Omit<UserConsent, 'id' | 'acceptedAt' | 'revokedAt'>): Promise<UserConsent> {
    const saved = await this.repository.save(this.repository.create(data));
    // El valor por defecto de accepted_at lo pone la base de datos: se vuelve a leer la fila
    const entity = await this.repository.findOneByOrFail({ id: saved.id });
    return toDomain(entity);
  }

  async findLatest(userId: string, consentType: string): Promise<UserConsent | null> {
    const entity = await this.repository.findOne({
      where: { userId, consentType, revokedAt: IsNull() },
      order: { acceptedAt: 'DESC' },
    });
    return entity ? toDomain(entity) : null;
  }
}
