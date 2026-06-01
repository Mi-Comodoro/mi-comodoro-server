import { Bill } from '../bills';

export interface BillsRepository {
  findAllByUser(userId: string): Promise<Bill[]>;
  findActiveByUser(userId: string): Promise<Bill[]>;
  findById(id: string, userId: string): Promise<Bill | null>;
  findManyByIds(ids: string[], userId: string): Promise<Bill[]>;
  create(data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bill>;
  update(id: string, userId: string, data: Partial<Bill>): Promise<Bill | null>;
  toggleActive(id: string, userId: string): Promise<Bill | null>;
  delete(id: string, userId: string): Promise<void>;
}
