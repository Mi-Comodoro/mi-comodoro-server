import type { GroupMember } from '../group-member';

export interface GroupMemberRepository {
  findByGroup(groupId: string): Promise<GroupMember[]>;
  findByUser(userId: string): Promise<GroupMember[]>;
  findOne(groupId: string, userId: string): Promise<GroupMember | null>;
  save(member: Partial<GroupMember>): Promise<GroupMember>;
  softDelete(id: string): Promise<void>;
}
