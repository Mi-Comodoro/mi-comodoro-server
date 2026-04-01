import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingPayload } from '../../users/domain/onboarding.types';
import { UserProfileRepository } from '../domain/user-profile.repository';

@Injectable()
export class OnboardingAccountListener {
  private readonly context: string = OnboardingAccountListener.name;

  constructor(
    @Inject('UserProfileRepository') private readonly userProfileRepository: UserProfileRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerProviderService,
  ) {}

  @OnEvent('user.onboarding.started')
  async setupAccount(payload: OnboardingPayload) {
    try {
      this.logger.info(
        this.context,
        `UserProfileModule: Setting up user-profile for user ${payload.userId}`,
      );

      const userProfile = await this.userProfileRepository.findByUserId(payload.userId);
      if (!userProfile) {
        throw new NotFoundException(`UserProfile not found for user ${payload.userId}`);
      }

      userProfile.displayName = payload.data.userInfo.displayName;
      userProfile.gender = payload.data.userInfo.gender;
      userProfile.phone = payload.data.userInfo.phone;

      await this.userProfileRepository.update(payload.userId, userProfile);

      this.logger.info(this.context, `UserProfile setup completed for user ${payload.userId}`);

      // Siguiente paso en cadena
      await this.eventEmitter.emitAsync('user-profile.setup.completed', payload);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(this.context, `UserProfile setup failed: ${errorMessage}`);
      await this.eventEmitter.emitAsync('onboarding.rollback', {
        userId: payload.userId,
        step: 'user-profile',
        error,
      });
    }
  }
}
