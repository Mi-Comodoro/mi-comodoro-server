import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { UserGroupRepository } from '../../domain/repositories/user-group.repository';
import type { UserGroup } from '../../domain/user-group';
import { UserGroupEntity } from '../database/entities/user-group.entity';

@Injectable()
export class UserGroupRepositoryImpl implements UserGroupRepository {
  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly repo: Repository<UserGroupEntity>,
  ) {}

  async findById(id: string): Promise<UserGroup | null> {
    return this.repo.findOne({ where: { id, nulledAt: IsNull() } });
  }

  async findByOwner(ownerId: string): Promise<UserGroup[]> {
    return this.repo.find({ where: { ownerId, nulledAt: IsNull() } });
  }

  async save(group: Partial<UserGroup>): Promise<UserGroup> {
    const entity = this.repo.create(group);
    return this.repo.save(entity);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { nulledAt: new Date() });
  }
}
