import { UpdateResult } from 'typeorm';

import { User } from './user.entity';

export interface UserRepository {
  findAll(): Promise<User[]>;
  save(user: Omit<User, 'userProfile' | 'id'>): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findAuthById(id: string): Promise<User | null>;
  findById(id: string): Promise<(Omit<User, 'password'> & { createdAt: Date }) | null>;
  completeOnboarding(userId: string): Promise<UpdateResult>;
  invalidateTokens(userId: string, currentVersion: number): Promise<UpdateResult>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  findByHandle(handle: string): Promise<User | null>;
  searchByHandle(query: string, excludeUserId: string): Promise<Omit<User, 'password'>[]>;
  updateHandle(userId: string, handle: string): Promise<void>;
  updateTimezone(userId: string, timezone: string): Promise<void>;
}
