export type GroupType = 'SHARED' | 'FAMILIAR' | 'TRAVEL';
export type GroupStatus = 'Planificando' | 'Activo' | 'Cerrado';

export interface UserGroup {
  id?: string;
  name: string;
  type: GroupType;
  ownerId: string;
  status: GroupStatus;
  maxMembers: number;
  goal?: number | null;
  destination?: string | null;
  estimatedDate?: Date | null;
  nulledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
