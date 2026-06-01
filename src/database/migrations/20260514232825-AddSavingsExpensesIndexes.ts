import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavingsExpensesIndexes20260514232825 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_planned_budget_status
        ON expenses_planned (budget_id, status);
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_planned_savings_goal_status_date
        ON planned_savings ("savingGoalId", status, date);
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_saving_goals_user_active
        ON saving_goals (user_id, "isActive");
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_incomes_planned_budget_status
        ON incomes_planned (budget_id, status);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_expenses_planned_budget_status;`);
    await qr.query(`DROP INDEX IF EXISTS idx_planned_savings_goal_status_date;`);
    await qr.query(`DROP INDEX IF EXISTS idx_saving_goals_user_active;`);
    await qr.query(`DROP INDEX IF EXISTS idx_incomes_planned_budget_status;`);
  }
}
