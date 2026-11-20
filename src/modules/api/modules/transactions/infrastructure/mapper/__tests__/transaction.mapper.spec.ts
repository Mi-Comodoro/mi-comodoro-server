import { TransactionEntity } from '../../database/entities/transaction.entity';
import { TransactionMapper } from '../transaction.mapper';

const makeEntity = (overrides: Partial<TransactionEntity> = {}): TransactionEntity => {
  const e = new TransactionEntity();
  e.id = 'txn-1';
  e.amount = 50000;
  e.source = 'manual';
  e.description = 'Compra supermercado';
  e.userId = 'user-1';
  e.budgetId = 'budget-1';
  e.categoryId = 'cat-1';
  e.billId = null as unknown as string;
  e.type = 'expense';
  e.transactionDate = new Date('2024-06-15');
  (e as unknown as Record<string, unknown>).nulledAt = null;
  e.createdAt = new Date('2024-06-15');
  e.updatedAt = new Date('2024-06-15');
  return Object.assign(e, overrides);
};

describe('TransactionMapper', () => {
  describe('toDomain', () => {
    it('maps all scalar fields correctly', () => {
      const entity = makeEntity();
      const domain = TransactionMapper.toDomain(entity);

      expect(domain.id).toBe('txn-1');
      expect(domain.amount).toBe(50000);
      expect(domain.source).toBe('manual');
      expect(domain.description).toBe('Compra supermercado');
      expect(domain.userId).toBe('user-1');
      expect(domain.budgetId).toBe('budget-1');
      expect(domain.categoryId).toBe('cat-1');
      expect(domain.type).toBe('expense');
      expect(domain.nulledAt).toBeNull();
    });

    it('maps amount as a number (not string)', () => {
      const entity = makeEntity({ amount: '125000.50' as unknown as number });
      const domain = TransactionMapper.toDomain(entity);
      expect(typeof domain.amount).toBe('number');
      expect(domain.amount).toBe(125000.5);
    });

    it('maps category relation when present', () => {
      const entity = makeEntity();
      entity.category = { id: 'cat-1', name: 'Supermercado' } as never;
      const domain = TransactionMapper.toDomain(entity);
      expect(domain.category).toEqual({ id: 'cat-1', name: 'Supermercado' });
    });

    it('sets category to undefined when not present', () => {
      const entity = makeEntity();
      entity.category = undefined as never;
      const domain = TransactionMapper.toDomain(entity);
      expect(domain.category).toBeUndefined();
    });

    it('maps account relation when present', () => {
      const entity = makeEntity();
      entity.account = { id: 'acc-1', name: 'Bancolombia' } as never;
      const domain = TransactionMapper.toDomain(entity);
      expect(domain.account).toEqual({ id: 'acc-1', name: 'Bancolombia' });
    });

    it('sets account to undefined when not present', () => {
      const entity = makeEntity();
      entity.account = undefined as never;
      const domain = TransactionMapper.toDomain(entity);
      expect(domain.account).toBeUndefined();
    });

    it('maps fromAccount and toAccount when present', () => {
      const entity = makeEntity();
      entity.fromAccount = { id: 'acc-from', name: 'Origen' } as never;
      entity.toAccount = { id: 'acc-to', name: 'Destino' } as never;
      const domain = TransactionMapper.toDomain(entity);
      expect(domain.fromAccount).toEqual({ id: 'acc-from', name: 'Origen' });
      expect(domain.toAccount).toEqual({ id: 'acc-to', name: 'Destino' });
    });
  });

  describe('toEntity', () => {
    it('maps required fields onto the entity', () => {
      const domain = {
        id: 'txn-2',
        amount: 30000,
        source: 'auto',
        userId: 'user-1',
        budgetId: 'budget-1',
        type: 'income' as const,
        transactionDate: new Date('2024-07-01'),
      };

      const entity = TransactionMapper.toEntity(domain);

      expect(entity).toBeInstanceOf(TransactionEntity);
      expect(entity.id).toBe('txn-2');
      expect(entity.amount).toBe(30000);
      expect(entity.source).toBe('auto');
      expect(entity.userId).toBe('user-1');
      expect(entity.budgetId).toBe('budget-1');
      expect(entity.type).toBe('income');
    });

    it('does not set id on the entity when not provided', () => {
      const domain = {
        amount: 10000,
        source: 'manual',
        userId: 'u-1',
        budgetId: 'b-1',
        type: 'expense' as const,
        transactionDate: new Date(),
      };

      const entity = TransactionMapper.toEntity(domain);
      expect(entity.id).toBeUndefined();
    });

    it('creates proxy relation entities for userId, budgetId, categoryId', () => {
      const domain = {
        amount: 5000,
        source: 'manual',
        userId: 'user-ref',
        budgetId: 'budget-ref',
        categoryId: 'cat-ref',
        type: 'expense' as const,
        transactionDate: new Date(),
      };

      const entity = TransactionMapper.toEntity(domain);
      expect(entity.user?.id).toBe('user-ref');
      expect(entity.budget?.id).toBe('budget-ref');
      expect(entity.category?.id).toBe('cat-ref');
    });

    it('maps account, fromAccount, toAccount proxy entities when provided', () => {
      const domain = {
        amount: 1000,
        source: 'transfer',
        userId: 'u-1',
        budgetId: 'b-1',
        type: 'expense' as const,
        transactionDate: new Date(),
        accountId: 'acc-1',
        fromAccountId: 'from-1',
        toAccountId: 'to-1',
      };

      const entity = TransactionMapper.toEntity(domain);
      expect(entity.account?.id).toBe('acc-1');
      expect(entity.fromAccount?.id).toBe('from-1');
      expect(entity.toAccount?.id).toBe('to-1');
    });

    it('skips optional fields when not provided', () => {
      const domain = {
        amount: 5000,
        source: 'manual',
        userId: 'u-1',
        budgetId: 'b-1',
        type: 'savings' as const,
        transactionDate: new Date(),
      };

      const entity = TransactionMapper.toEntity(domain);
      expect(entity.description).toBeUndefined();
      expect(entity.categoryId).toBeUndefined();
      expect(entity.user).toBeTruthy(); // proxy still created for userId
    });
  });
});
