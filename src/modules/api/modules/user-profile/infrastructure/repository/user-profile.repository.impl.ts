import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { GenderEnum } from '../../../shared/enum/enum';
import { UserProfile, UserProfileDTO } from '../../domain/user-profile.entity';
import { UserProfileRepository } from '../../domain/user-profile.repository';
import { UserProfileEntity } from '../database/entities/user-profile.entity';
@Injectable()
export class UserProfileRepositoryImpl implements UserProfileRepository {
  private readonly context: string = UserProfileRepositoryImpl.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
  ) {}
  async save(userProfile: UserProfile): Promise<UserProfile> {
    const TRIAL_DAYS = 14;
    const trialEndsAt = addDays(new Date(), TRIAL_DAYS);
    this.logger.info(this.context, 'Creating user-profile');
    try {
      const accountData = {
        ...userProfile,
        gender: userProfile.gender as unknown as GenderEnum,
        trialEndsAt,
      };
      const newUserProfile = this.userProfileRepository.create(accountData);
      const saved = (await this.userProfileRepository.save(newUserProfile)) as UserProfile;
      return saved;
    } catch (error) {
      throw error;
    }
  }
  async findById(id: string): Promise<UserProfile | null> {
    const userProfile = await this.userProfileRepository.findOne({ where: { id } });
    if (!userProfile) {
      return null;
    }
    return userProfile as UserProfile;
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const userProfile = await this.userProfileRepository.findOne({ where: { userId } });
    if (!userProfile) {
      return null;
    }
    return userProfile as UserProfile;
  }

  async update(userId: string, userProfile: UserProfileDTO): Promise<UserProfile> {
    const existingProfile = await this.userProfileRepository.findOne({ where: { userId } });
    if (!existingProfile) {
      throw new NotFoundException(`UserProfile not found for userId: ${userId}`);
    }
    const data = { ...existingProfile, ...userProfile };

    return await this.userProfileRepository.save(data);
  }
}
