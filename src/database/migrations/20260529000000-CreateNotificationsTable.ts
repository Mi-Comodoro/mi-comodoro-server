import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable20260529000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "notification_type_enum" AS ENUM ('friend_request', 'friend_accepted', 'friend_rejected')`,
    );

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notification_user_read" ON "notifications" ("user_id", "is_read")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_user_read"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
  }
}
