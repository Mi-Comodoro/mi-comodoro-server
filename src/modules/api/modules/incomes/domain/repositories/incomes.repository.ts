import { CreateIncomeSourceDTO, IncomeSource, UpdateIncomeSourceDTO } from '../incomes';

export interface IncomesRepository {
  create(income: CreateIncomeSourceDTO): Promise<IncomeSource>;
  bulkCreate(createIncomeDto: CreateIncomeSourceDTO[]): Promise<IncomeSource[]>;
  findById(id: string): Promise<IncomeSource | null>;
  findAll(): Promise<IncomeSource[]>;
  findCurrentMonthIncomes(
    userId: string,
    month: number,
    year: number,
  ): Promise<{
    expectedIncomes: { source: string; amount: number; date: Date }[];
    totalExpectedIncomes: number;
    lastUpdate: Date;
  }>;
  update(id: string, income: UpdateIncomeSourceDTO): Promise<IncomeSource | null>;
  delete(id: string): Promise<boolean>;
}
