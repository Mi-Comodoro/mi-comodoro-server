export type GroupType = 'SHARED' | 'FAMILIAR' | 'TRAVEL';
export type GroupStatus = 'active' | 'inactive';

export interface UserGroup {
  id?: string;
  name: string;
  type: GroupType;
  ownerId: string;
  status: GroupStatus;
  maxMembers: number;
  nulledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
