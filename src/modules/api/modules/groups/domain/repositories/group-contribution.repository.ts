import type { GroupContribution } from '../group-contribution';

export interface GroupContributionRepository {
  findByGroup(groupId: string): Promise<GroupContribution[]>;
  findByMember(groupId: string, userId: string): Promise<GroupContribution[]>;
  save(contribution: Partial<GroupContribution>): Promise<GroupContribution>;
}
