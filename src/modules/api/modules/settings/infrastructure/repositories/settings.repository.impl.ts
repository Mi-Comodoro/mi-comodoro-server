import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SettingsRepository } from '../../domain/repositories/settings.repository';
import { Settings } from '../../domain/settings';
import { SettingsEntity } from '../database/entities/settings.entity';
import { SettingsMapper } from '../mapper/settings.mapper';

@Injectable()
export class SettingsRepositoryImpl implements SettingsRepository {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly repo: Repository<SettingsEntity>,
  ) {}

  async findByUserId(userId: string): Promise<Settings | null> {
    const entity = await this.repo.findOne({ where: { userId } });
    return entity ? SettingsMapper.toDomain(entity) : null;
  }

  async upsert(
    userId: string,
    data?: Partial<Omit<Settings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Settings> {
    let entity = await this.repo.findOne({ where: { userId } });

    if (!entity) {
      entity = this.repo.create({ userId, ...data });
    } else if (data) {
      Object.assign(entity, data);
    }

    const saved = await this.repo.save(entity);
    return SettingsMapper.toDomain(saved);
  }

  async update(
    userId: string,
    data: Partial<Omit<Settings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Settings> {
    await this.repo.update({ userId }, data);
    const updated = await this.repo.findOne({ where: { userId } });
    return SettingsMapper.toDomain(updated!);
  }
}
