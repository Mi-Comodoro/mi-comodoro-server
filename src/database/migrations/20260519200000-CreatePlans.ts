import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlans20260519200000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR DEFAULT 'COP',
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        is_public BOOLEAN DEFAULT TRUE,
        nulled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      INSERT INTO plans (name, price, features, is_public) VALUES
        ('Free', 0, '["Presupuesto mensual","Metas de ahorro","Analytics","AP/AR","1 cuenta"]', true),
        ('Pro', 0, '["Todo Free","Grupos compartidos","Múltiples cuentas","Reportes PDF","Soporte prioritario"]', true)
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS plans;`);
  }
}
