import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPlans20260610000002 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    console.log('\n💎 [Migration 3/3] Ejecutando seed de planes...');
    await qr.query(`
      INSERT INTO plans (id, name, price, currency, features, is_active, is_public, nulled_at, created_at, updated_at)
      VALUES
        (
          '9f43eb67-05dd-4805-8f08-42ed5f80b9ec',
          'Free',
          0.00,
          'COP',
          '["1 presupuesto activo","Transacciones ilimitadas","Metas de ahorro","3 cuentas de referencia","Categorías predefinidas","Proyecciones 1 año","Reportes básicos","Histórico 6 meses"]',
          true,
          true,
          NULL,
          '2026-05-29T04:43:34.325Z',
          '2026-05-29T04:43:34.325Z'
        ),
        (
          'b02e493c-8b5a-4926-9642-33a906e12d82',
          'Plus',
          0.00,
          'COP',
          '["3 presupuestos activos","Transacciones ilimitadas","Metas de ahorro","Cuentas de referencia ilimitadas","Categorías personalizadas","Proyecciones 3 años","Reportes mensual + anual","Compartido con 2 personas","Histórico 18 meses","Exportar CSV"]',
          true,
          true,
          NULL,
          '2026-05-29T04:43:34.325Z',
          '2026-05-29T04:43:34.325Z'
        ),
        (
          '3d92be13-c4d8-4bcd-b888-31657f53d16b',
          'Pro',
          0.00,
          'COP',
          '["Presupuestos ilimitados","Transacciones ilimitadas","Metas de ahorro","Cuentas de referencia ilimitadas","Categorías personalizadas","Proyecciones 10+ años","Reportes completos","Compartido con 6 personas","Histórico ilimitado","Exportar CSV · PDF · Excel","Mi Despensa"]',
          true,
          true,
          NULL,
          '2026-05-29T04:43:34.325Z',
          '2026-05-29T04:43:34.325Z'
        )
      ON CONFLICT (id) DO NOTHING
    `);
    const result = await qr.query(`SELECT name, price FROM plans ORDER BY name`);
    result.forEach((p: { name: string; price: string }) =>
      console.log(`   📦 Plan: ${p.name} ($${p.price} COP)`),
    );
    console.log('✅ [Migration 3/3] Planes insertados\n');
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DELETE FROM plans
      WHERE id IN (
        '9f43eb67-05dd-4805-8f08-42ed5f80b9ec',
        'b02e493c-8b5a-4926-9642-33a906e12d82',
        '3d92be13-c4d8-4bcd-b888-31657f53d16b'
      )
    `);
  }
}
