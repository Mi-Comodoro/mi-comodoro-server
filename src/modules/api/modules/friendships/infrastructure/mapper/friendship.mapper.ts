import { Friendship } from '../../domain/friendship';
import { FriendshipEntity } from '../database/entities/friendship.entity';

export class FriendshipMapper {
  static toDomain(entity: FriendshipEntity): Friendship {
    return {
      id: entity.id,
      requesterId: entity.requesterId,
      addresseeId: entity.addresseeId,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
