import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { Finances } from '../../domain/finances';
import { FinancesRepository } from '../../domain/repositories/finances.repository';
import { FinancesEntity } from '../database/entities/finances.entity';

export class FinancesRepositoryImpl implements FinancesRepository {
  constructor(
    @InjectRepository(FinancesEntity)
    private readonly financesRepository: Repository<FinancesEntity>,
    private readonly logger: LoggerProviderService,
  ) {}
  async save(finances: Finances): Promise<Finances> {
    this.logger.info(FinancesRepositoryImpl.name, 'Saving finances data');
    const financesData = this.financesRepository.create(finances);
    return await this.financesRepository.save(financesData);
  }

  async findByUserId(userId: string): Promise<Finances | null> {
    this.logger.info(FinancesRepositoryImpl.name, 'Saving finances data');
    const financesData = await this.financesRepository.findOne({ where: { userId } });
    return financesData as unknown as Finances | null;
  }
}
