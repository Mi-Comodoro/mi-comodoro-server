export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  SAVINGS = 'savings',
}
export enum CategoryBucket {
  NEEDS = 'needs',
  WANTS = 'wants',
}
export interface Category {
  id: string;
  type: CategoryType;
  bucket?: CategoryBucket;
  name: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  isSelectable: boolean;
  createdAt: Date;
  updatedAt: Date;
  nulledAt?: Date | null;
}
