import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupMembers20260515074554 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE member_role AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id  UUID NOT NULL REFERENCES user_groups(id),
        user_id   UUID NOT NULL,
        role      member_role NOT NULL DEFAULT 'VIEWER',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        nulled_at TIMESTAMPTZ,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_group_user UNIQUE (group_id, user_id)
      );
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS group_members;`);
    await qr.query(`DROP TYPE IF EXISTS member_role;`);
  }
}
