import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { FinancialHealthScore } from '../../domain/financial-health-score';
import { FinancialHealthScoreRepository } from '../../domain/repositories/financial-health-score.repository';
import { FinancialHealthScoreEntity } from '../database/entities/financial-health-score.entity';

@Injectable()
export class FinancialHealthScoreRepositoryImpl implements FinancialHealthScoreRepository {
  private readonly context = FinancialHealthScoreRepositoryImpl.name;

  constructor(
    @InjectRepository(FinancialHealthScoreEntity)
    private readonly repo: Repository<FinancialHealthScoreEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async insert(
    score: Omit<FinancialHealthScore, 'id' | 'calculatedAt'>,
  ): Promise<FinancialHealthScore> {
    const entity = this.repo.create(score);
    const saved = await this.repo.save(entity);
    this.logger.info(
      this.context,
      `Score financiero persistido para usuario ${score.userId}: ${score.totalScore} (${score.level})`,
    );
    return saved;
  }

  async findRecentByUserId(userId: string): Promise<FinancialHealthScore | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const entity = await this.repo
      .createQueryBuilder('fhs')
      .where('fhs.user_id = :userId', { userId })
      .andWhere('fhs.calculated_at > :oneHourAgo', { oneHourAgo })
      .orderBy('fhs.calculated_at', 'DESC')
      .limit(1)
      .getOne();

    return entity ?? null;
  }
}
