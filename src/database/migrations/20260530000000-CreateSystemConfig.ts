import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemConfig20260530000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key         VARCHAR PRIMARY KEY,
        value       VARCHAR NOT NULL,
        description VARCHAR,
        updated_by  VARCHAR,
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const defaults: [string, string, string][] = [
      ['savings_default_pct', '20', 'Porcentaje de ahorro sugerido en presupuesto por defecto (%)'],
      ['trial_duration_days', '14', 'Días de prueba para nuevos usuarios en plan TRIAL'],
      ['budget_limit_free', '1', 'Máximo de presupuestos para plan FREE'],
      ['budget_limit_plus', '3', 'Máximo de presupuestos para plan PLUS'],
      ['goals_limit_free', '3', 'Máximo de metas de ahorro para plan FREE'],
      ['groups_enabled_free', 'false', 'Habilitar grupos para plan FREE'],
      ['groups_enabled_plus', 'true', 'Habilitar grupos para plan PLUS'],
    ];

    for (const [key, value, description] of defaults) {
      await qr.query(
        `INSERT INTO system_config (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
        [key, value, description],
      );
    }
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS system_config`);
  }
}
