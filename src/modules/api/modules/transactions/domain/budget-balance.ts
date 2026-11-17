import { BadRequestException } from '@nestjs/common';

export interface BudgetTotals {
  income: number;
  expense: number;
  savings: number;
}

export const formatBalance = (value: number): string =>
  `$${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Valida que el presupuesto tenga ingresos reales y saldo suficiente para el monto.
 * Saldo disponible = ingresos reales - gastos reales - ahorros reales.
 */
export const assertSufficientBalance = (totals: BudgetTotals, amount: number): void => {
  if (totals.income <= 0) {
    throw new BadRequestException('Aún no has registrado ingresos en este presupuesto.');
  }
  const available = totals.income - totals.expense - totals.savings;
  if (amount > available) {
    throw new BadRequestException(
      `Saldo insuficiente: tu saldo disponible es ${formatBalance(Math.max(available, 0))}.`,
    );
  }
};
