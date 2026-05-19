import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSettings20260518120000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID           UNIQUE NOT NULL,
        currency               VARCHAR        NOT NULL DEFAULT 'COP',
        language               VARCHAR        NOT NULL DEFAULT 'es',
        notifications_enabled  BOOLEAN        NOT NULL DEFAULT TRUE,
        budget_alert_threshold INTEGER        NOT NULL DEFAULT 80,
        savings_percentage     DECIMAL(5,2)   NOT NULL DEFAULT 20,
        created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      );
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS user_settings;`);
  }
}
