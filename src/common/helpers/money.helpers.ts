import { getMoneyStrategy } from '@/common/money/money.strategy';

/** Redondeo de la moneda por defecto, para los cálculos que no dependen de una persona concreta. */
function roundMoney(value: number): number {
  return getMoneyStrategy().round(value);
}

export { roundMoney };
