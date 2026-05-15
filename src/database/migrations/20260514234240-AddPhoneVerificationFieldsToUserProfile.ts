import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneVerificationFieldsToUserProfile20260514234240 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE user_profile
        ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE user_profile
        DROP COLUMN IF EXISTS is_phone_verified,
        DROP COLUMN IF EXISTS phone_verified_at;
    `);
  }
}
