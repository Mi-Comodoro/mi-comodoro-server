import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { GroupContribution } from '../../domain/group-contribution';
import type { GroupContributionRepository } from '../../domain/repositories/group-contribution.repository';
import { GroupContributionEntity } from '../database/entities/group-contribution.entity';

@Injectable()
export class GroupContributionRepositoryImpl implements GroupContributionRepository {
  constructor(
    @InjectRepository(GroupContributionEntity)
    private readonly repo: Repository<GroupContributionEntity>,
  ) {}

  async findByGroup(groupId: string): Promise<GroupContribution[]> {
    return this.repo.find({
      where: { groupId, nulledAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  async findByMember(groupId: string, userId: string): Promise<GroupContribution[]> {
    return this.repo.find({
      where: { groupId, userId, nulledAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  async save(contribution: Partial<GroupContribution>): Promise<GroupContribution> {
    const entity = this.repo.create(contribution);
    return this.repo.save(entity);
  }
}
