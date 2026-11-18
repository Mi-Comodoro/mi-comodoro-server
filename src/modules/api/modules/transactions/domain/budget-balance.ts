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
  /** Saldo disponible real: ingresos - gastos - ahorros registrados */
  available: number;
  /** Gastos planificados aún sin pagar (los pagados ya descontaron el saldo disponible) */
  pendingExpenses: number;
}

/**
 * Un gasto planificado se puede respaldar de dos formas, y vale la que más holgura dé:
 * - con los ingresos esperados, una vez separados los ahorros y los gastos ya planificados;
 * - con el saldo disponible, descontando lo que ya está planificado y sin pagar.
 * Si no hay ni ingresos esperados ni saldo disponible, no se puede planificar.
 */
export const getPlanningRoom = (totals: PlannedBudgetTotals): number | null => {
  const hasExpected = totals.income > 0;
  const hasBalance = totals.available > 0;
  if (!hasExpected && !hasBalance) return null;

  const fromExpected = hasExpected
    ? totals.income - totals.savings - totals.expenses
    : Number.NEGATIVE_INFINITY;
  const fromBalance = totals.available - totals.pendingExpenses;
  return Math.max(fromExpected, fromBalance);
};

export const assertPlannedExpenseFits = (totals: PlannedBudgetTotals, amount: number): void => {
  const room = getPlanningRoom(totals);
  if (room === null) {
    throw new BadRequestException(
      'Aún no tienes ingresos esperados ni saldo disponible para planificar gastos.',
    );
  }
  if (amount > room) {
    throw new BadRequestException(
      `Este gasto supera lo que te queda por planificar: ${formatBalance(Math.max(room, 0))} ` +
        '(tus ingresos esperados menos ahorros y gastos planificados, o tu saldo disponible).',
    );
  }
};
