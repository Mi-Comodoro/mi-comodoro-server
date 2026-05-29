import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { FriendshipStatus } from '../../domain/enums/friendship-status.enum';
import { FriendProfile } from '../../domain/friend-profile';
import { Friendship } from '../../domain/friendship';
import { FriendshipRepository } from '../../domain/repositories/friendship.repository';
import { FriendshipEntity } from '../database/entities/friendship.entity';
import { FriendshipMapper } from '../mapper/friendship.mapper';

@Injectable()
export class FriendshipRepositoryImpl implements FriendshipRepository {
  private readonly context = FriendshipRepositoryImpl.name;

  constructor(
    @InjectRepository(FriendshipEntity)
    private readonly repo: Repository<FriendshipEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async findByPair(requesterId: string, addresseeId: string): Promise<Friendship | null> {
    const entity = await this.repo.findOne({ where: { requesterId, addresseeId } });
    return entity ? FriendshipMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<Friendship | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? FriendshipMapper.toDomain(entity) : null;
  }

  async save(data: Omit<Friendship, 'id' | 'createdAt' | 'updatedAt'>): Promise<Friendship> {
    try {
      const entity = this.repo.create(data);
      const saved = await this.repo.save(entity);
      return FriendshipMapper.toDomain(saved);
    } catch (error) {
      this.logger.error(this.context, 'Error saving friendship', String(error));
      throw error;
    }
  }

  async updateStatus(id: string, status: FriendshipStatus): Promise<void> {
    await this.repo.update(id, { status });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findAcceptedByUserId(userId: string): Promise<Friendship[]> {
    const entities = await this.repo.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
    });
    return entities.map(FriendshipMapper.toDomain);
  }

  async findAcceptedByUserIdWithProfiles(userId: string): Promise<FriendProfile[]> {
    const entities = await this.repo.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: {
        requester: { userProfile: true },
        addressee: { userProfile: true },
      },
    });

    return entities.map((e) => {
      const friend = e.requesterId === userId ? e.addressee : e.requester;
      return {
        friendshipId: e.id,
        friendUserId: friend.id,
        displayName: friend.userProfile?.displayName ?? friend.userProfile?.name ?? null,
        handle: friend.handle ?? null,
        photo: friend.userProfile?.photo ?? null,
      };
    });
  }

  async findReceivedPending(addresseeId: string): Promise<Friendship[]> {
    const entities = await this.repo.find({
      where: { addresseeId, status: FriendshipStatus.PENDING },
    });
    return entities.map(FriendshipMapper.toDomain);
  }

  async findSentPending(requesterId: string): Promise<Friendship[]> {
    const entities = await this.repo.find({
      where: { requesterId, status: FriendshipStatus.PENDING },
    });
    return entities.map(FriendshipMapper.toDomain);
  }
}
