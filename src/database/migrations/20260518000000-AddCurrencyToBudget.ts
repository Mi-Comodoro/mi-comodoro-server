import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyToBudget20260518000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE budgets
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'COP';
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS currency;
    `);
  }
}
