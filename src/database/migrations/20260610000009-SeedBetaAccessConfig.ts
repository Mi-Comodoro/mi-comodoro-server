import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea las variables de la beta cerrada. Admin > Configuración solo lista las filas que existen, así que
 * sin ellas el cupo y la vigencia de la invitación no se pueden cambiar desde el panel.
 * ON CONFLICT: si alguien ya fijó un valor, se respeta.
 */
export class SeedBetaAccessConfig20260610000009 implements MigrationInterface {
  name = 'SeedBetaAccessConfig20260610000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO system_config (key, value, description) VALUES
        ('beta_max_users', '10', 'Cupo de la beta cerrada: solicitudes aprobadas más personas registradas'),
        ('beta_invite_days', '14', 'Días de vigencia de una invitación a la beta')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM system_config WHERE key IN ('beta_max_users', 'beta_invite_days')`,
    );
  }
}
