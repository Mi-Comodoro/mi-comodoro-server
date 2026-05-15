import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNulledAtToSavingGoals20260514180000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE saving_goals
        ADD COLUMN IF NOT EXISTS nulled_at TIMESTAMPTZ DEFAULT NULL;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE saving_goals DROP COLUMN IF EXISTS nulled_at;
    `);
  }
}
