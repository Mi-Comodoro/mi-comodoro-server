export interface AccountPayablePayment {
  id?: string;
  accountPayableId: string;
  amount: number;
  paymentDate: Date;
  notes?: string;
  createdAt?: Date;
}
