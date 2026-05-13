import { AccountPayable } from '../account-payable';
import { AccountPayablePayment } from '../account-payable-payment';

export interface AccountPayableRepository {
  findAll(userId: string): Promise<AccountPayable[]>;
  findOne(id: string, userId: string): Promise<AccountPayable | null>;
  create(data: Omit<AccountPayable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountPayable>;
  update(id: string, data: Partial<AccountPayable>): Promise<AccountPayable | null>;
  softDelete(id: string): Promise<void>;
  registerPayment(
    accountPayableId: string,
    amount: number,
    paymentDate: Date,
    notes?: string,
  ): Promise<void>;
  getSummaryData(userId: string): Promise<{
    accounts: AccountPayable[];
    avgMonthlyIncome: number;
  }>;
}

export { AccountPayable, AccountPayablePayment };
