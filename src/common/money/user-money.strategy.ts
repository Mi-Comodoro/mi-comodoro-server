import type { DataSource } from 'typeorm';

import { getMoneyStrategy, type MoneyStrategy } from './money.strategy';

/**
 * Estrategia según la moneda del perfil financiero de la persona. No se usa budgets.currency: ningún
 * flujo lo asigna y todos los presupuestos quedan con el valor por defecto.
 */
export const findUserMoneyStrategy = async (
  source: Pick<DataSource, 'query'>,
  userId: string,
): Promise<MoneyStrategy> => {
  const rows = await source.query<{ currency: string }[]>(
    'SELECT currency FROM finances WHERE user_id = $1',
    [userId],
  );
  return getMoneyStrategy(rows?.[0]?.currency);
};
