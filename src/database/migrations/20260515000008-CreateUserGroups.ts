import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserGroups20260515000008 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE group_type AS ENUM ('SHARED', 'FAMILIAR', 'TRAVEL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE group_status AS ENUM ('active', 'inactive');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR NOT NULL,
        type        group_type NOT NULL DEFAULT 'SHARED',
        owner_id    UUID NOT NULL,
        status      group_status NOT NULL DEFAULT 'active',
        max_members INTEGER NOT NULL DEFAULT 5,
        nulled_at   TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_user_groups_owner_id ON user_groups (owner_id);
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_user_groups_status ON user_groups (status);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS user_groups;`);
    await qr.query(`DROP TYPE IF EXISTS group_type;`);
    await qr.query(`DROP TYPE IF EXISTS group_status;`);
  }
}
