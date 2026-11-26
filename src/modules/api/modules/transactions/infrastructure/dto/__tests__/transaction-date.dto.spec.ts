import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateManualTransactionDto } from '../create-manual-transaction.dto';
import { UpdateTransactionDto } from '../update-transaction.dto';

const UUID = '0a6c0b5c-5d75-4cb6-8fd0-4f3185806c1f';

const base = {
  amount: 100,
  type: 'expense',
  source: 'Prueba',
  categoryId: UUID,
  budgetId: UUID,
};

const dateErrors = async (cls: new () => object, payload: object) =>
  (await validate(plainToInstance(cls, payload, { enableImplicitConversion: true }))).filter(
    (e) => e.property === 'transactionDate',
  );

describe('fecha de transacción en los DTO', () => {
  it.each(['mañana', '2026-13-45', 'abc', '0NaN-aN-aN'])(
    'rechaza "%s" al crear (antes llegaba a la base de datos y devolvía 500)',
    async (value) => {
      expect(
        await dateErrors(CreateManualTransactionDto, { ...base, transactionDate: value }),
      ).toHaveLength(1);
    },
  );

  it.each(['2026-11-26', '2026-11-26T10:30:00.000Z'])('acepta "%s" al crear', async (value) => {
    expect(
      await dateErrors(CreateManualTransactionDto, { ...base, transactionDate: value }),
    ).toHaveLength(0);
  });

  it('exige la fecha al crear', async () => {
    expect(await dateErrors(CreateManualTransactionDto, base)).toHaveLength(1);
  });

  it('rechaza una fecha inválida al editar y permite omitirla', async () => {
    expect(await dateErrors(UpdateTransactionDto, { transactionDate: 'mañana' })).toHaveLength(1);
    expect(await dateErrors(UpdateTransactionDto, {})).toHaveLength(0);
  });
});
