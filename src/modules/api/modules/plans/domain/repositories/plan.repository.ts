import { Plan } from '../plan';

export interface PlanRepository {
  save(plan: Partial<Plan>): Promise<Plan>;
  findAll(): Promise<Plan[]>;
  findPublic(): Promise<Plan[]>;
  findById(id: string): Promise<Plan | null>;
  softDelete(id: string): Promise<void>;
}
