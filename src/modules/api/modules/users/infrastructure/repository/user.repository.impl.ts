import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, UpdateResult } from 'typeorm';

import { getErrorMessage } from '@/common/helpers/error.helpers';
import { LoggerProviderService } from '@/core/providers';

import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';
import { UserEntity } from '../database/user.entity';
import { UserMapper } from '../mapper/users.mapper';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  private readonly context: string = UserRepositoryImpl.name;
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly logger: LoggerProviderService,
  ) {}
  async findAll(): Promise<User[]> {
    try {
      return await this.userRepository.find();
    } catch (error) {
      this.logger.error(
        this.context,
        'Error al obtener todos los usuarios',
        getErrorMessage(error),
      );
      throw error;
    }
  }

  async save(user: Omit<User, 'userProfile'>): Promise<User> {
    try {
      const userData = this.userRepository.create(user);
      return await this.userRepository.save(userData);
    } catch (error) {
      this.logger.error(this.context, 'Error creating user', getErrorMessage(error));
      throw error;
    }
  }
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          email,
        },
        relations: {
          userProfile: true,
          finances: true,
        },
      });

      return user;
    } catch (error) {
      throw error;
    }
  }
  async findAuthById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: {
          id,
        },
        relations: {
          userProfile: true,
          finances: true,
        },
      });
    } catch (error) {
      throw error;
    }
  }
  async findById(id: string): Promise<(Omit<User, 'password'> & { createdAt: Date }) | null> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          id,
        },
        relations: {
          userProfile: true,
          finances: true,
        },
      });
      if (!user) {
        return null;
      }
      return UserMapper.toClient(user);
    } catch (error) {
      throw error;
    }
  }

  async completeOnboarding(userId: string): Promise<UpdateResult> {
    try {
      return await this.userRepository.update(userId, { onboarding: 'COMPLETED' });
    } catch (error) {
      this.logger.error(
        this.context,
        `Error completing onboarding for user ${userId}`,
        getErrorMessage(error),
      );
      throw error;
    }
  }

  async invalidateTokens(userId: string, currentVersion: number): Promise<UpdateResult> {
    try {
      return await this.userRepository.update(userId, { tokenVersion: currentVersion + 1 });
    } catch (error) {
      this.logger.error(
        this.context,
        `Error invalidating tokens for user ${userId}`,
        getErrorMessage(error),
      );
      throw error;
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(id, { password: passwordHash });
  }

  async findByHandle(handle: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { handle },
        relations: { userProfile: true },
      });
    } catch (error) {
      throw error;
    }
  }

  async searchByHandle(query: string, excludeUserId: string): Promise<Omit<User, 'password'>[]> {
    try {
      const results = await this.userRepository.find({
        where: { handle: ILike(`%${query}%`) },
        relations: { userProfile: true },
        take: 20,
      });
      return results
        .filter((u) => u.id !== excludeUserId && u.handle)
        .map((u) => {
          const result = { ...u } as Partial<typeof u>;
          delete result.password;
          return result as Omit<typeof u, 'password'>;
        });
    } catch (error) {
      this.logger.error(this.context, `Error searching users by handle: ${query}`, String(error));
      throw error;
    }
  }

  async updateHandle(userId: string, handle: string): Promise<void> {
    try {
      await this.userRepository.update(userId, { handle });
    } catch (error) {
      this.logger.error(this.context, `Error updating handle for user ${userId}`, String(error));
      throw error;
    }
  }

  async updateTimezone(userId: string, timezone: string): Promise<void> {
    try {
      await this.userRepository.update(userId, { timezone });
    } catch (error) {
      this.logger.error(
        this.context,
        `Error actualizando zona horaria para usuario ${userId}`,
        String(error),
      );
      throw error;
    }
  }
}
