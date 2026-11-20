import { EntityManager } from 'typeorm';

/**
 * Bloquea la fila del presupuesto hasta que termine la transacción en curso.
 * Quien valida el saldo debe llamarlo antes de leer los totales: dos peticiones simultáneas sobre
 * el mismo presupuesto se ejecutan una tras otra y la segunda ve el saldo ya descontado.
 * Se usa NO KEY UPDATE para no bloquear las inserciones con llave foránea hacia el presupuesto.
 */
export const lockBudgetRow = async (manager: EntityManager, budgetId: string): Promise<void> => {
  await manager.query('SELECT id FROM budgets WHERE id = $1 FOR NO KEY UPDATE', [budgetId]);
};
