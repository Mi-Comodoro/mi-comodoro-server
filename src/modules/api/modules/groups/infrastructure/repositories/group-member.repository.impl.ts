import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { GroupMember } from '../../domain/group-member';
import type { GroupMemberRepository } from '../../domain/repositories/group-member.repository';
import { GroupMemberEntity } from '../database/entities/group-member.entity';

@Injectable()
export class GroupMemberRepositoryImpl implements GroupMemberRepository {
  constructor(
    @InjectRepository(GroupMemberEntity)
    private readonly repo: Repository<GroupMemberEntity>,
  ) {}

  async findByGroup(groupId: string): Promise<GroupMember[]> {
    return this.repo.find({ where: { groupId, nulledAt: IsNull() } });
  }

  async findByUser(userId: string): Promise<GroupMember[]> {
    return this.repo.find({ where: { userId, nulledAt: IsNull() } });
  }

  async findOne(groupId: string, userId: string): Promise<GroupMember | null> {
    return this.repo.findOne({ where: { groupId, userId, nulledAt: IsNull() } });
  }

  async save(member: Partial<GroupMember>): Promise<GroupMember> {
    const entity = this.repo.create(member);
    return this.repo.save(entity);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { nulledAt: new Date() });
  }
}
