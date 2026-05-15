export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface GroupMember {
  id?: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  isActive: boolean;
  nulledAt?: Date | null;
  joinedAt?: Date;
}
