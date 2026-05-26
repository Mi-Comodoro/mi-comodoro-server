import { UpdateResult } from 'typeorm';

import { User } from './user.entity';

export interface UserRepository {
  save(user: Omit<User, 'userProfile' | 'id'>): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findAuthById(id: string): Promise<User | null>;
  findById(id: string): Promise<(Omit<User, 'password'> & { createdAt: Date }) | null>;
  completeOnboarding(userId: string): Promise<UpdateResult>;
  invalidateTokens(userId: string, currentVersion: number): Promise<UpdateResult>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}
