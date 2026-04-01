import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingErrorPayload } from '../domain/onboarding.types';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class OnboardingResponseListener {
  private readonly context: string = OnboardingResponseListener.name;

  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    private readonly logger: LoggerProviderService,
  ) {}

  @OnEvent('onboarding.completed')
  async handleOnboardingSuccess(payload: { userId: string }) {
    this.logger.info(
      this.context,
      `✅ Onboarding successfully completed for user ${payload.userId}`,
    );
    const user = await this.userRepository.findById(payload.userId);
    if (user) {
      const result = await this.userRepository.completeOnboarding(payload.userId);
      if (result.affected && result.affected > 0) {
        this.logger.info(this.context, `User ${payload.userId} marked as onboarding completed`);
        return { onboarding: 'COMPLETED' };
      }
    }
  }

  @OnEvent('onboarding.rollback')
  handleOnboardingRollback(payload: OnboardingErrorPayload) {
    const errorMsg = payload.error instanceof Error ? payload.error.message : String(payload.error);
    this.logger.warn(
      this.context,
      `⚠️ Onboarding rollback triggered at step: ${payload.step} for user ${payload.userId}`,
    );
    this.logger.error(this.context, `Rollback error: ${errorMsg}`);
  }

  @OnEvent('onboarding.failed')
  handleOnboardingFailure(payload: OnboardingErrorPayload) {
    const errorMsg = payload.error instanceof Error ? payload.error.message : String(payload.error);
    this.logger.error(
      this.context,
      `❌ Onboarding failed for email: ${payload.email}. Error: ${errorMsg}`,
    );
  }
}
