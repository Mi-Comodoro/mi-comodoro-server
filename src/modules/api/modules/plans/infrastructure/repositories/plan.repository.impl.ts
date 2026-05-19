import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Plan } from '../../domain/plan';
import { PlanRepository } from '../../domain/repositories/plan.repository';
import { PlanEntity } from '../database/plan.entity';
import { PlanMapper } from '../mapper/plan.mapper';

@Injectable()
export class PlanRepositoryImpl implements PlanRepository {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly planRepo: Repository<PlanEntity>,
  ) {}

  async save(plan: Partial<Plan>): Promise<Plan> {
    const entity = PlanMapper.toEntity(plan);
    if (plan.id) {
      entity.id = plan.id;
    }
    const saved = await this.planRepo.save(entity);
    return PlanMapper.toDomain(saved);
  }

  async findAll(): Promise<Plan[]> {
    const entities = await this.planRepo.find({ where: { nulledAt: IsNull() } });
    return entities.map(PlanMapper.toDomain);
  }

  async findPublic(): Promise<Plan[]> {
    const entities = await this.planRepo.find({
      where: { nulledAt: IsNull(), isPublic: true },
    });
    return entities.map(PlanMapper.toDomain);
  }

  async findById(id: string): Promise<Plan | null> {
    const entity = await this.planRepo.findOne({ where: { id, nulledAt: IsNull() } });
    return entity ? PlanMapper.toDomain(entity) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.planRepo.update({ id }, { nulledAt: new Date() });
  }
}
