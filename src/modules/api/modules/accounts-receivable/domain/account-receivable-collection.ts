export interface AccountReceivableCollection {
  id?: string;
  accountReceivableId: string;
  amount: number;
  collectionDate: Date;
  notes?: string;
  createdAt?: Date;
}
