import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePaymentDto } from '../../../../accounts-payable/infrastructure/dto/create-payment.dto';
import { CreateCollectionDto } from '../../../../accounts-receivable/infrastructure/dto/create-collection.dto';
import { CreateContributionDto } from '../../../../savings/infrastructure/dto/create-contribution.dto';
import { SavingsGoalsCreateDto } from '../../../../savings/infrastructure/dto/savings-goals.dto';
import { CreateManualTransactionDto } from '../create-manual-transaction.dto';
import { UpdateTransactionDto } from '../update-transaction.dto';

const UUID = '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f';

const errorsFor = async (cls: new () => object, payload: object, property: string) =>
  (await validate(plainToInstance(cls, payload, { enableImplicitConversion: true }))).filter(
    (e) => e.property === property,
  );

describe('los importes admiten como máximo 2 decimales', () => {
  const cases: Array<[string, new () => object, object, string]> = [
    [
      'crear transacción',
      CreateManualTransactionDto,
      {
        type: 'expense',
        source: 'x',
        categoryId: UUID,
        budgetId: UUID,
        transactionDate: '2026-11-26',
      },
      'amount',
    ],
    ['editar transacción', UpdateTransactionDto, {}, 'amount'],
    [
      'aporte a una meta',
      CreateContributionDto,
      { date: '2026-11-26', contributionType: 'internal' },
      'amount',
    ],
    ['pago de una deuda', CreatePaymentDto, { paymentDate: '2026-11-26' }, 'amount'],
    ['cobro', CreateCollectionDto, { collectionDate: '2026-11-26' }, 'amount'],
    [
      'monto objetivo de una meta',
      SavingsGoalsCreateDto,
      { name: 'x', reason: 'x' },
      'targetAmount',
    ],
  ];

  it.each(cases)('%s rechaza 10.123 y acepta 10.12', async (_name, cls, base, property) => {
    expect(await errorsFor(cls, { ...base, [property]: 10.123 }, property)).toHaveLength(1);
    expect(await errorsFor(cls, { ...base, [property]: 10.12 }, property)).toHaveLength(0);
    expect(await errorsFor(cls, { ...base, [property]: 10 }, property)).toHaveLength(0);
  });
});
