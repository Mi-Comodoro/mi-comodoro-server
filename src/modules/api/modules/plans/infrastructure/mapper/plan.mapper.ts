import { Plan } from '../../domain/plan';
import { PlanEntity } from '../database/plan.entity';

export class PlanMapper {
  static toDomain(entity: PlanEntity): Plan {
    return {
      id: entity.id,
      name: entity.name,
      price: Number(entity.price),
      currency: entity.currency,
      features: entity.features,
      isActive: entity.isActive,
      isPublic: entity.isPublic,
      nulledAt: entity.nulledAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toEntity(domain: Partial<Plan>): PlanEntity {
    const entity = new PlanEntity();
    if (domain.name !== undefined) entity.name = domain.name;
    if (domain.price !== undefined) entity.price = domain.price;
    if (domain.currency !== undefined) entity.currency = domain.currency;
    if (domain.features !== undefined) entity.features = domain.features;
    if (domain.isActive !== undefined) entity.isActive = domain.isActive;
    if (domain.isPublic !== undefined) entity.isPublic = domain.isPublic;
    if (domain.nulledAt !== undefined) entity.nulledAt = domain.nulledAt;
    return entity;
  }
}
