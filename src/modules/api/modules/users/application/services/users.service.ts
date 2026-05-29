import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { IncomeSource } from '../../../incomes/domain/incomes';
import { extractDay } from '../../../shared/utils/dates';
import { UserProfileRepository } from '../../../user-profile/domain/user-profile.repository';
import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';
import { UpdateHandleDto } from '../../infrastructure/dto/update-handle.dto';
import { UpdateUserDto } from '../../infrastructure/dto/update-user.dto';
import { OnboardingData } from '../dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly context: string = UsersService.name;

  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('UserProfileRepository') private readonly userProfileRepository: UserProfileRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerProviderService,
  ) {}

  async onboarding(data: OnboardingData) {
    try {
      this.logger.info(this.context, 'Starting onboarding process');

      const user = await this.userRepository.findByEmail(data.userInfo.email);
      if (!user) {
        this.logger.warn(this.context, `User not found during onboarding: ${data.userInfo.email}`);
        throw new NotFoundException('User not found');
      }

      const incomes: IncomeSource[] = this.getIncomesData(data, user);

      const newData = {
        ...data,
        incomes,
      };
      // Inicia la cadena de eventos
      await this.eventEmitter.emitAsync('user.onboarding.started', {
        userId: user.id,
        data: newData,
      });

      const checkUser = await this.userRepository.findByEmail(data.userInfo.email);

      return { onboarding: checkUser?.onboarding };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(this.context, `Onboarding failed: ${errorMessage}`);
      await this.eventEmitter.emitAsync('onboarding.failed', {
        email: data.userInfo.email,
        error,
      });
      throw error;
    }
  }
  async onboardingByUserId(userId: string, data: OnboardingData) {
    try {
      this.logger.info(this.context, `Starting onboarding process for user ${userId}`);

      const user = await this.userRepository.findAuthById(userId);
      if (!user) {
        this.logger.warn(this.context, `User not found during onboarding: ${userId}`);
        throw new NotFoundException('User not found');
      }

      const normalizedData: OnboardingData = {
        ...data,
        userInfo: {
          ...data.userInfo,
          email: user.email,
        },
      };
      this.logger.info(
        this.context,
        `Onboarding bound to authenticated user ${user.id} with persisted email ${user.email}`,
      );

      const incomes: IncomeSource[] = this.getIncomesData(normalizedData, user);

      const newData = {
        ...normalizedData,
        incomes,
      };

      await this.eventEmitter.emitAsync('user.onboarding.started', {
        userId: user.id,
        data: newData,
      });

      const checkUser = await this.userRepository.findAuthById(user.id);

      return { onboarding: checkUser?.onboarding };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(this.context, `Onboarding failed: ${errorMessage}`);
      await this.eventEmitter.emitAsync('onboarding.failed', {
        userId,
        email: data.userInfo.email,
        error,
      });
      throw error;
    }
  }
  async checkPhoneAvailability(phone: string): Promise<{ available: boolean }> {
    const normalized = phone.replace(/[\s\-().]/g, '');
    try {
      const exists = await this.userProfileRepository.existsByPhone(normalized);
      const available = !exists;
      this.logger.info(
        this.context,
        `Verificación de teléfono completada — disponible: ${available}`,
      );
      return { available };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(this.context, `Error al verificar disponibilidad de teléfono: ${msg}`);
      throw error;
    }
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    this.logger.info(this.context, `Updating profile for user ${userId}`);
    const profile = await this.userProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    const updated = await this.userProfileRepository.update(userId, { ...profile, ...dto });
    return updated;
  }

  async getCurrentUser(payload: JwtPayload) {
    this.logger.info(this.context, `Fetching user details for user ${payload.userId}`);
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async updateHandle(userId: string, dto: UpdateHandleDto): Promise<{ handle: string }> {
    this.logger.info(this.context, `Updating handle for user ${userId}`);
    const existing = await this.userRepository.findByHandle(dto.handle);
    if (existing && existing.id !== userId) {
      throw new ConflictException('Este handle ya está en uso');
    }
    await this.userRepository.updateHandle(userId, dto.handle);
    return { handle: dto.handle };
  }

  async searchUsers(query: string, requestingUserId: string) {
    this.logger.info(this.context, `Searching users with query: ${query}`);
    return await this.userRepository.searchByHandle(query, requestingUserId);
  }

  private getIncomesData(data: OnboardingData, user: User): IncomeSource[] {
    const incomes: IncomeSource[] = [];
    const isMonthlyBudget = data.budget.budgetFrequency === 'monthly';
    const isBiweeklyBudget = data.budget.budgetFrequency === 'biweekly';

    if (isMonthlyBudget && !data.finances.monthPayment) {
      this.logger.warn(this.context, 'Monthly payment date is missing for monthly budget');
      throw new NotFoundException('Monthly payment date is required for monthly budget');
    }
    if (
      isBiweeklyBudget &&
      (!data.finances.biweeklyPayments || data.finances.biweeklyPayments.length !== 2)
    ) {
      this.logger.warn(
        this.context,
        'Biweekly payment dates are missing or incomplete for biweekly budget',
      );
      throw new NotFoundException('Two biweekly payment dates are required for biweekly budget');
    }
    if (isMonthlyBudget) {
      this.logger.info(
        this.context,
        `Processing monthly budget for user ${user.id} with payment date ${data.finances.monthPayment}`,
      );

      for (const income of data.incomes.incomes) {
        const securePaymentIncome = {
          userId: user.id,
          amount: income.amount,
          source: income.source,
          frequency: data.budget.budgetFrequency,
          paymentDays: extractDay(data.finances.monthPayment!),
          isActive: true,
        };

        if (!income.isAdditional) {
          incomes.push(securePaymentIncome);
        } else {
          incomes.push({
            userId: user.id,
            amount: income.amount,
            source: income.source,
            frequency: data.incomes.frequency!,
            paymentDays: extractDay(data.incomes.paymentDates),
            isActive: true,
          });
        }
      }
    }

    if (isBiweeklyBudget) {
      this.logger.info(
        this.context,
        `Processing biweekly budget for user ${user.id} with payment dates ${data.finances.biweeklyPayments?.join(', ')}`,
      );

      for (const income of data.incomes.incomes) {
        const securePaymentIncome = {
          userId: user.id,
          amount: income.amount,
          source: income.source,
          frequency: data.budget.budgetFrequency,
          paymentDays: extractDay(data.finances.biweeklyPayments!),
          isActive: true,
        };
        incomes.push(securePaymentIncome);
      }
    }

    return incomes;
  }
}
