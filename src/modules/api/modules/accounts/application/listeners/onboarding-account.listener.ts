import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerProviderService } from '@/core/providers';
import { OnboardingPayload } from '@/modules/api/modules/users/domain/onboarding.types';

import { Account } from '../../domain/account';
import { AccountRepository } from '../../domain/repositories/account.respository';

@Injectable()
export class OnboardingAccountListener {
  private readonly context: string = OnboardingAccountListener.name;

  constructor(
    @Inject('AccountRepository') private readonly accountRepository: AccountRepository,
    private readonly logger: LoggerProviderService,
  ) {}

  @OnEvent('budget.setup.completed')
  async setupPrimaryAccount(payload: OnboardingPayload) {
    try {
      this.logger.info(
        this.context,
        `AccountsModule: Creating primary account for user ${payload.userId}`,
      );

      // Verificar si ya existe una cuenta principal
      const existingPrimaryAccount = await this.accountRepository.findPrimaryByUserId(
        payload.userId,
      );

      if (existingPrimaryAccount) {
        this.logger.info(
          this.context,
          `AccountsModule: Primary account already exists for user ${payload.userId}`,
        );
        return;
      }

      // Crear la cuenta principal
      const primaryAccount: Account = {
        name: payload.data.finances.accountName,
        type: 'bank',
        isPrimary: true,
        userId: payload.userId,
        interestRate: payload.data.finances.interestRate,
        compoundingFrequency: 'monthly',
        isActive: true,
      };

      await this.accountRepository.add(primaryAccount);

      this.logger.info(
        this.context,
        `AccountsModule: Primary account created successfully for user ${payload.userId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        this.context,
        `AccountsModule: Failed to create primary account for user ${payload.userId}. Error: ${errorMessage}`,
      );
      // No emitimos rollback aquí porque la creación de la cuenta no es crítica para el onboarding
      // El usuario puede crear cuentas manualmente después
    }
  }
}
