import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountTypeEnumAndTrialEndsAt20260519220000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE account_type_enum AS ENUM ('TRIAL','FREE','PLUS','PRO','PARTNER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profile
        ALTER COLUMN type TYPE account_type_enum
          USING (CASE
            WHEN type = 'trial'     THEN 'TRIAL'
            WHEN type = 'free'      THEN 'FREE'
            WHEN type = 'paid'      THEN 'PRO'
            ELSE                         'FREE'
          END)::account_type_enum,
        ALTER COLUMN type SET DEFAULT 'TRIAL',
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP NULL
    `);

    await queryRunner.query(`
      UPDATE user_profile
      SET trial_ends_at = created_at + INTERVAL '45 days'
      WHERE type = 'TRIAL' AND trial_ends_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_profile
        ALTER COLUMN type TYPE VARCHAR
          USING type::text,
        ALTER COLUMN type DROP DEFAULT
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS account_type_enum`);
  }
}
