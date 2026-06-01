import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPlansData20260519210000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      UPDATE plans SET
        features = '["1 presupuesto activo","Transacciones ilimitadas","Metas de ahorro","3 cuentas de referencia","Categorías predefinidas","Proyecciones 1 año","Reportes básicos","Histórico 6 meses"]'
      WHERE name = 'Free';

      UPDATE plans SET
        features = '["Presupuestos ilimitados","Transacciones ilimitadas","Metas de ahorro","Cuentas de referencia ilimitadas","Categorías personalizadas","Proyecciones 10+ años","Reportes completos","Compartido con 6 personas","Histórico ilimitado","Exportar CSV · PDF · Excel","Mi Despensa"]'
      WHERE name = 'Pro';

      INSERT INTO plans (name, price, currency, features, is_active, is_public)
      SELECT 'Plus', 0, 'COP',
        '["3 presupuestos activos","Transacciones ilimitadas","Metas de ahorro","Cuentas de referencia ilimitadas","Categorías personalizadas","Proyecciones 3 años","Reportes mensual + anual","Compartido con 2 personas","Histórico 18 meses","Exportar CSV"]',
        true, true
      WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Plus');
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DELETE FROM plans WHERE name IN ('Free', 'Plus', 'Pro');`);
  }
}
