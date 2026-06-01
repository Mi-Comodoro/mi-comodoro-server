import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNulledAtToBudgets20260519000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE budgets
        ADD COLUMN IF NOT EXISTS nulled_at TIMESTAMPTZ DEFAULT NULL;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS nulled_at;
    `);
  }
}
