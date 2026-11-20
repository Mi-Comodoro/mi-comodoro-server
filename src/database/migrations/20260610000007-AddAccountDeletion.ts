import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Derecho de supresión (Ley 1581 de 2012): la persona solicita eliminar su cuenta y sus datos
 * viven hasta 90 días antes del borrado permanente.
 *
 * - users.deletion_requested_at / deletion_scheduled_at marcan la solicitud y la fecha del borrado.
 * - Se crea el usuario «Persona eliminada», al que se reasignan los registros compartidos con otras
 *   personas (gastos de un grupo, aportes) para no alterar las cuentas de los demás ni dejar huérfanos.
 *   No puede iniciar sesión: su contraseña está vacía y está marcado como eliminado.
 */
export class AddAccountDeletion20260610000007 implements MigrationInterface {
  name = 'AddAccountDeletion20260610000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled
      ON users (deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO users (id, email, password, provider, nulled_at)
      VALUES ('00000000-0000-4000-8000-000000000000', 'persona.eliminada@invalid.local', '', 'LOCAL', now())
      ON CONFLICT (id) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO user_profile (user_id, name, display_name, is_active)
      VALUES ('00000000-0000-4000-8000-000000000000', 'Persona eliminada', 'Persona eliminada', false)
      ON CONFLICT (user_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_deletion_scheduled`);
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS deletion_scheduled_at,
        DROP COLUMN IF EXISTS deletion_requested_at
    `);
    // El usuario «Persona eliminada» se conserva: puede tener registros reasignados
  }
}
