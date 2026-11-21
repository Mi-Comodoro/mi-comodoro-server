import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Solicitudes de acceso a la beta cerrada. Datos mínimos: correo, evidencia de la autorización (versión
 * de la política y fecha puesta por el servidor, sin IP) y el estado del trámite. La invitación se guarda
 * como hash SHA-256: el token solo se ve una vez, al aprobar.
 *
 * registered_user_id no tiene llave foránea a propósito: al borrar la cuenta lo limpia
 * AccountDeletionService (la fila ya no tiene correo desde que la persona se registra).
 */
export class AddBetaAccessRequests20260610000008 implements MigrationInterface {
  name = 'AddBetaAccessRequests20260610000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS beta_access_requests (
        id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        email              VARCHAR(254),
        status             VARCHAR(20)  NOT NULL DEFAULT 'pending',
        policy_version     VARCHAR(20)  NOT NULL,
        consent_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
        decided_by         UUID,
        decided_at         TIMESTAMPTZ,
        invite_token_hash  VARCHAR(64),
        invite_expires_at  TIMESTAMPTZ,
        registered_user_id UUID,
        registered_at      TIMESTAMPTZ,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_beta_access_status"
          CHECK (status IN ('pending', 'approved', 'rejected', 'registered'))
      )
    `);
    // Una sola solicitud por correo (el correo se borra al registrarse, así que no bloquea nada después)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_beta_access_email
      ON beta_access_requests (lower(email)) WHERE email IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_beta_access_token
      ON beta_access_requests (invite_token_hash) WHERE invite_token_hash IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_beta_access_status ON beta_access_requests (status, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_beta_access_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_beta_access_token`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_beta_access_email`);
    await queryRunner.query(`DROP TABLE IF EXISTS beta_access_requests`);
  }
}
