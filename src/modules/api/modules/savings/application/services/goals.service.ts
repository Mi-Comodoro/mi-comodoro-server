import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { GoalsRepository } from '../../domain/repositories/goals.repository';
import { SavingGoal } from '../../domain/savings-goals';

@Injectable()
export class GoalsService {
  private readonly context: string = GoalsService.name;
  constructor(
    @Inject('GoalsRepository') private goalsRepository: GoalsRepository,
    private readonly logger: LoggerProviderService,
  ) {}
  async create(data: SavingGoal): Promise<SavingGoal> {
    this.logger.info(this.context, 'Creating saving goals');
    return await this.goalsRepository.create(data);
  }

  async find(userId: string): Promise<SavingGoal[]> {
    this.logger.info(this.context, `getting saving goals by userId: ${userId}`);
    return await this.goalsRepository.find(userId);
  }
}
