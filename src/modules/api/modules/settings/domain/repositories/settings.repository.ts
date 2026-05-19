import { Settings } from '../settings';

export interface SettingsRepository {
  findByUserId(userId: string): Promise<Settings | null>;
  upsert(
    userId: string,
    data?: Partial<Omit<Settings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Settings>;
  update(
    userId: string,
    data: Partial<Omit<Settings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Settings>;
}
