import { Category } from '../category';

export interface CategoryRepository {
  save(category: Partial<Category>): Promise<Category>;
  count(): Promise<number>;
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findByType(type: 'income' | 'expense' | 'savings'): Promise<Category | null>; // ← agregar
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}
