import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable20260530200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
        "admin_id"     VARCHAR     NOT NULL,
        "admin_handle" VARCHAR     NOT NULL,
        "action"       VARCHAR     NOT NULL,
        "target_id"    VARCHAR,
        "target_type"  VARCHAR,
        "before"       JSONB,
        "after"        JSONB,
        "ip"           VARCHAR,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_admin_id" ON "audit_logs" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_created_at" ON "audit_logs" ("created_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
