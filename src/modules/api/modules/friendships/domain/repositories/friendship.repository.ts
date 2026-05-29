import { FriendshipStatus } from '../enums/friendship-status.enum';
import { FriendProfile } from '../friend-profile';
import { Friendship } from '../friendship';

export interface FriendshipRepository {
  findByPair(requesterId: string, addresseeId: string): Promise<Friendship | null>;
  findById(id: string): Promise<Friendship | null>;
  save(data: Omit<Friendship, 'id' | 'createdAt' | 'updatedAt'>): Promise<Friendship>;
  updateStatus(id: string, status: FriendshipStatus): Promise<void>;
  delete(id: string): Promise<void>;
  findAcceptedByUserId(userId: string): Promise<Friendship[]>;
  findAcceptedByUserIdWithProfiles(userId: string): Promise<FriendProfile[]>;
  findReceivedPending(addresseeId: string): Promise<Friendship[]>;
  findSentPending(requesterId: string): Promise<Friendship[]>;
}
