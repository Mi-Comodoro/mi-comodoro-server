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

export interface PlannedBudgetTotals {
  /** Ingresos esperados (no omitidos) del presupuesto */
  income: number;
  /** Ahorros planificados (no omitidos) del presupuesto */
  savings: number;
  /** Gastos planificados vigentes (pendientes o pagados) del presupuesto */
  expenses: number;
}

/**
 * Un gasto planificado debe caber en los ingresos esperados una vez separados los ahorros:
 * disponible para planificar = ingresos esperados - ahorros planificados - gastos ya planificados.
 */
export const assertPlannedExpenseFits = (totals: PlannedBudgetTotals, amount: number): void => {
  if (totals.income <= 0) {
    throw new BadRequestException('Aún no tienes ingresos esperados en este presupuesto.');
  }
  const room = totals.income - totals.savings - totals.expenses;
  if (amount > room) {
    throw new BadRequestException(
      `Este gasto supera lo que te queda por planificar: ${formatBalance(Math.max(room, 0))} ` +
        '(ingresos esperados menos ahorros y gastos ya planificados).',
    );
  }
};
