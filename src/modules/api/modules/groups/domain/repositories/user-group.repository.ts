import type { UserGroup } from '../user-group';

export interface UserGroupRepository {
  findById(id: string): Promise<UserGroup | null>;
  findByOwner(ownerId: string): Promise<UserGroup[]>;
  save(group: Partial<UserGroup>): Promise<UserGroup>;
  softDelete(id: string): Promise<void>;
}
