import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionsIndexes20260514172142 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_budget_date_type
        ON transactions (budget_id, transaction_date, type)
        WHERE nulled_at IS NULL;
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date
        ON transactions (user_id, transaction_date);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_transactions_budget_date_type;`);
    await qr.query(`DROP INDEX IF EXISTS idx_transactions_user_date;`);
  }
}
