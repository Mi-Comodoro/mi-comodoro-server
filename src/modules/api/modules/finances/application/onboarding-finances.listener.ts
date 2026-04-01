import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingFinancesPayload, OnboardingPayload } from '../../users/domain/onboarding.types';
import { Finances, FinancialProfileType } from '../domain/finances';
import { FinancesRepository } from '../domain/repositories/finances.repository';

@Injectable()
export class OnboardingFinancesListener {
  private readonly context: string = OnboardingFinancesListener.name;

  constructor(
    @Inject('FinancesRepository')
    private readonly financesRepository: FinancesRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerProviderService,
  ) {}

  @OnEvent('user-profile.setup.completed')
  async setupFinances(payload: OnboardingPayload) {
    try {
      this.logger.info(
        this.context,
        `FinancesModule: Creating financial profile for user ${payload.userId}`,
      );

      const finances: Finances = {
        userId: payload.userId,
        profile: payload.data.finances.profile as FinancialProfileType,
        currency: payload.data.finances.currency,
      };
      const existing = await this.financesRepository.findByUserId(payload.userId);
      if (!existing) {
        const savedFinances = await this.financesRepository.save(finances);

        this.logger.info(this.context, `Financial profile created with ID ${savedFinances.id}`);

        // ✅ Emitir con financesId agregado
        const financesPayload: OnboardingFinancesPayload = {
          ...payload,
          financesId: savedFinances.id,
        };

        await this.eventEmitter.emitAsync('finances.setup.completed', financesPayload);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(this.context, `Finances setup failed: ${errorMessage}`);
      await this.eventEmitter.emitAsync('onboarding.rollback', {
        userId: payload.userId,
        step: 'finances',
        error,
      });
    }
  }
}
