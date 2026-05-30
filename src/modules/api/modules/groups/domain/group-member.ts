export type MemberRole = 'ORGANIZER' | 'CO_ORGANIZER' | 'MEMBER' | 'VIEWER';
export type MemberStatus = 'active' | 'invited' | 'external';

export interface GroupMember {
  id?: string;
  groupId: string;
  userId?: string | null;
  role: MemberRole;
  memberStatus: MemberStatus;
  isActive: boolean;
  externalName?: string | null;
  nulledAt?: Date | null;
  joinedAt?: Date;
}
