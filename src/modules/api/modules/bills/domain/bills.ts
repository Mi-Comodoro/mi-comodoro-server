import { Category } from '../../categories/domain/category';
import { User } from '../../users/domain/user.entity';

export interface Bills {
  id: string;
  user: User;
  category: Category;
  expectedAmount: number;
  dueDate: Date;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  description?: string;
  isPaid: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
