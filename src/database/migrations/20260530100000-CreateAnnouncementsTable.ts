import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncementsTable20260530100000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "announcements" (
        "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
        "title"            VARCHAR     NOT NULL,
        "body"             TEXT        NOT NULL,
        "segment"          VARCHAR     NOT NULL DEFAULT 'all',
        "sent_by"          VARCHAR     NOT NULL,
        "sent_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "recipient_count"  INTEGER     NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_announcements" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "announcements"`);
  }
}
