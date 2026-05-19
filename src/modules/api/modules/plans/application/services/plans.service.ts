import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { Plan } from '../../domain/plan';
import { PlanRepository } from '../../domain/repositories/plan.repository';
import { CreatePlanDto } from '../../infrastructure/dto/create-plan.dto';
import { UpdatePlanDto } from '../../infrastructure/dto/update-plan.dto';

@Injectable()
export class PlansService {
  private readonly context: string = PlansService.name;

  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('PlanRepository')
    private readonly planRepository: PlanRepository,
  ) {}

  async getPublicPlans(): Promise<Plan[]> {
    this.logger.info(this.context, 'Getting public plans');
    return this.planRepository.findPublic();
  }

  async getAllPlans(): Promise<Plan[]> {
    this.logger.info(this.context, 'Getting all plans');
    return this.planRepository.findAll();
  }

  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    this.logger.info(this.context, 'Creating plan');
    return this.planRepository.save({
      name: dto.name,
      price: dto.price ?? 0,
      currency: dto.currency ?? 'COP',
      features: dto.features ?? [],
      isActive: dto.isActive ?? true,
      isPublic: dto.isPublic ?? true,
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
    this.logger.info(this.context, `Updating plan ${id}`);
    const existing = await this.planRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }
    return this.planRepository.save({ ...existing, ...dto });
  }

  async deletePlan(id: string): Promise<void> {
    this.logger.info(this.context, `Deleting plan ${id}`);
    const existing = await this.planRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }
    await this.planRepository.softDelete(id);
  }
}
