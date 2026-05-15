import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNulledAtToUsers20260515081419 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nulled_at TIMESTAMPTZ;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS nulled_at;
    `);
  }
}
