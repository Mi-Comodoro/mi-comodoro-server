import { AccountReceivable } from '../account-receivable';

export interface AccountReceivableRepository {
  findAll(userId: string): Promise<AccountReceivable[]>;
  findOne(id: string, userId: string): Promise<AccountReceivable | null>;
  findById(id: string): Promise<AccountReceivable | null>;
  create(
    data: Omit<AccountReceivable, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AccountReceivable>;
  update(id: string, data: Partial<AccountReceivable>): Promise<AccountReceivable | null>;
  softDelete(id: string): Promise<void>;
  setLinkedCxp(id: string, linkedCxpId: string): Promise<void>;
  registerCollection(
    accountReceivableId: string,
    amount: number,
    collectionDate: Date,
    notes?: string,
  ): Promise<void>;
  getSummaryData(userId: string): Promise<AccountReceivableSummaryData>;
}

export interface AccountReceivableSummaryData {
  totalReceivable: number;
  overdueCount: number;
  expectedThisMonth: number;
  nextDueDate: Date | null;
  collectedThisMonth: number;
  byStatus: {
    pending: number;
    partial: number;
    overdue: number;
  };
}
