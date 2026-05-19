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
      INSERT INTO plans (name, price, currency, features, is_active, is_public) VALUES
        ('Free', 0, 'COP',
          '["1 presupuesto activo","Transacciones ilimitadas","Metas de ahorro","3 cuentas de referencia","Categorías predefinidas","Proyecciones 1 año","Reportes básicos","Histórico 6 meses"]',
          true, true),
        ('Plus', 0, 'COP',
          '["3 presupuestos activos","Transacciones ilimitadas","Metas de ahorro","Cuentas de referencia ilimitadas","Categorías personalizadas","Proyecciones 3 años","Reportes mensual + anual","Compartido con 2 personas","Histórico 18 meses","Exportar CSV"]',
          true, true),
        ('Pro', 0, 'COP',
          '["Presupuestos ilimitados","Transacciones ilimitadas","Metas de ahorro","Cuentas de referencia ilimitadas","Categorías personalizadas","Proyecciones 10+ años","Reportes completos","Compartido con 6 personas","Histórico ilimitado","Exportar CSV · PDF · Excel","Mi Despensa"]',
          true, true)
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS plans;`);
  }
}
