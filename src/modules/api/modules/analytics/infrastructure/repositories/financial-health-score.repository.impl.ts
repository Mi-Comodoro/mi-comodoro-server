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

  async findTodayByUserId(userId: string): Promise<FinancialHealthScore | null> {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const entity = await this.repo
      .createQueryBuilder('fhs')
      .where('fhs.user_id = :userId', { userId })
      .andWhere('fhs.calculated_at >= :start', { start })
      .andWhere('fhs.calculated_at < :end', { end })
      .orderBy('fhs.calculated_at', 'DESC')
      .getOne();

    return entity ?? null;
  }
}
