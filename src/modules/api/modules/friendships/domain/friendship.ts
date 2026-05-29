import { FriendshipStatus } from './enums/friendship-status.enum';

export interface Friendship {
  readonly id: string;
  readonly requesterId: string;
  readonly addresseeId: string;
  readonly status: FriendshipStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
