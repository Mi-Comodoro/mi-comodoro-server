import { Finances } from '../finances';

export interface FinancesRepository {
  save(finances: Finances): Promise<Finances>;
  findByUserId(userId: string): Promise<Finances | null>;
}
