import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';
import { UserEntity } from '../database/user.entity';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  private readonly context: string = UserRepositoryImpl.name;
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly logger: LoggerProviderService,
  ) {}
  async save(user: User): Promise<User> {
    try {
      const data = await this.userRepository.save(user);
      this.logger.info(this.context, 'User created has successfully');
      return data;
    } catch (error) {
      console.log(error);
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
          account: true,
        },
      });

      return user as User;
    } catch (error) {
      throw error;
    }
  }
}
