export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  isActive: boolean;
  isPublic: boolean;
  nulledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
