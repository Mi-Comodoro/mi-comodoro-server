import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Evidencia de la autorización de tratamiento de datos (Ley 1581 de 2012): qué versión de la
 * política aceptó cada persona, cuándo y desde qué IP/dispositivo.
 */
export class AddUserConsents20260610000006 implements MigrationInterface {
  name = 'AddUserConsents20260610000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID         NOT NULL,
        consent_type  VARCHAR(40)  NOT NULL,
        version       VARCHAR(20)  NOT NULL,
        accepted_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        ip            VARCHAR(64),
        user_agent    VARCHAR(255),
        revoked_at    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "FK_user_consents_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_consents_user_type
      ON user_consents (user_id, consent_type, accepted_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_consents_user_type`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_consents`);
  }
}
