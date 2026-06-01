import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNulledAtToCategories20260519100000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE categories ADD COLUMN IF NOT EXISTS nulled_at TIMESTAMPTZ DEFAULT NULL;`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE categories DROP COLUMN IF EXISTS nulled_at;`);
  }
}
