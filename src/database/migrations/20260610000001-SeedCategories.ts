import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCategories20260610000001 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    console.log('\n🌱 [Migration 2/3] Ejecutando seed de categorías...');
    await qr.query(`
      DO $$
      DECLARE
        v_vivienda_id        UUID;
        v_transporte_id      UUID;
        v_alimentacion_id    UUID;
        v_salud_id           UUID;
        v_entretenimiento_id UUID;
        v_restaurantes_id    UUID;
        v_compras_id         UUID;
        v_viajes_id          UUID;
        v_movilidad_id       UUID;
        v_ahorros_id         UUID;
        v_ingresos_id        UUID;
      BEGIN
        IF (SELECT COUNT(*) FROM categories) > 0 THEN
          RETURN;
        END IF;

        -- NEEDS ----------------------------------------------------------------

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Vivienda', 'expense', 'needs', false, NOW(), NOW())
        RETURNING id INTO v_vivienda_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Alquiler',     'expense', 'needs', v_vivienda_id, true, NOW(), NOW()),
          ('Hipoteca',     'expense', 'needs', v_vivienda_id, true, NOW(), NOW()),
          ('Internet',     'expense', 'needs', v_vivienda_id, true, NOW(), NOW()),
          ('Electricidad', 'expense', 'needs', v_vivienda_id, true, NOW(), NOW()),
          ('Agua',         'expense', 'needs', v_vivienda_id, true, NOW(), NOW()),
          ('Gas',          'expense', 'needs', v_vivienda_id, true, NOW(), NOW());

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Transporte', 'expense', 'needs', false, NOW(), NOW())
        RETURNING id INTO v_transporte_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Gasolina',               'expense', 'needs', v_transporte_id, true, NOW(), NOW()),
          ('Transporte público',     'expense', 'needs', v_transporte_id, true, NOW(), NOW()),
          ('Mantenimiento vehículo', 'expense', 'needs', v_transporte_id, true, NOW(), NOW());

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Alimentación', 'expense', 'needs', false, NOW(), NOW())
        RETURNING id INTO v_alimentacion_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Supermercado',  'expense', 'needs', v_alimentacion_id, true, NOW(), NOW()),
          ('Mercado local', 'expense', 'needs', v_alimentacion_id, true, NOW(), NOW());

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Salud', 'expense', 'needs', false, NOW(), NOW())
        RETURNING id INTO v_salud_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Seguro médico',     'expense', 'needs', v_salud_id, true, NOW(), NOW()),
          ('Medicamentos',      'expense', 'needs', v_salud_id, true, NOW(), NOW()),
          ('Consultas médicas', 'expense', 'needs', v_salud_id, true, NOW(), NOW());

        -- WANTS ----------------------------------------------------------------

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Entretenimiento', 'expense', 'wants', false, NOW(), NOW())
        RETURNING id INTO v_entretenimiento_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Netflix',     'expense', 'wants', v_entretenimiento_id, true, NOW(), NOW()),
          ('Spotify',     'expense', 'wants', v_entretenimiento_id, true, NOW(), NOW()),
          ('Cine',        'expense', 'wants', v_entretenimiento_id, true, NOW(), NOW()),
          ('Videojuegos', 'expense', 'wants', v_entretenimiento_id, true, NOW(), NOW());

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Restaurantes', 'expense', 'wants', false, NOW(), NOW())
        RETURNING id INTO v_restaurantes_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Comidas fuera', 'expense', 'wants', v_restaurantes_id, true, NOW(), NOW()),
          ('Cafeterías',    'expense', 'wants', v_restaurantes_id, true, NOW(), NOW());

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Compras personales', 'expense', 'wants', false, NOW(), NOW())
        RETURNING id INTO v_compras_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Ropa',       'expense', 'wants', v_compras_id, true, NOW(), NOW()),
          ('Tecnología', 'expense', 'wants', v_compras_id, true, NOW(), NOW()),
          ('Accesorios', 'expense', 'wants', v_compras_id, true, NOW(), NOW());

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Viajes', 'expense', 'wants', false, NOW(), NOW())
        RETURNING id INTO v_viajes_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Vuelos',      'expense', 'wants', v_viajes_id, true, NOW(), NOW()),
          ('Hotel',       'expense', 'wants', v_viajes_id, true, NOW(), NOW()),
          ('Actividades', 'expense', 'wants', v_viajes_id, true, NOW(), NOW());

        INSERT INTO categories (name, type, bucket, is_selectable, created_at, updated_at)
        VALUES ('Movilidad', 'expense', 'wants', false, NOW(), NOW())
        RETURNING id INTO v_movilidad_id;

        INSERT INTO categories (name, type, bucket, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Uber / Taxi',          'expense', 'wants', v_movilidad_id, true, NOW(), NOW()),
          ('Alquiler de vehículo', 'expense', 'wants', v_movilidad_id, true, NOW(), NOW());

        -- SAVINGS (sin bucket) -------------------------------------------------

        INSERT INTO categories (name, type, is_selectable, created_at, updated_at)
        VALUES ('Ahorros', 'savings', false, NOW(), NOW())
        RETURNING id INTO v_ahorros_id;

        INSERT INTO categories (name, type, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Fondo de emergencia', 'savings', v_ahorros_id, true, NOW(), NOW()),
          ('Retiro',              'savings', v_ahorros_id, true, NOW(), NOW()),
          ('Inversiones',         'savings', v_ahorros_id, true, NOW(), NOW()),
          ('Viaje futuro',        'savings', v_ahorros_id, true, NOW(), NOW());

        -- INCOME (sin bucket) --------------------------------------------------

        INSERT INTO categories (name, type, is_selectable, created_at, updated_at)
        VALUES ('Ingresos', 'income', false, NOW(), NOW())
        RETURNING id INTO v_ingresos_id;

        INSERT INTO categories (name, type, parent_id, is_selectable, created_at, updated_at)
        VALUES
          ('Salario',        'income', v_ingresos_id, true, NOW(), NOW()),
          ('Freelance',      'income', v_ingresos_id, true, NOW(), NOW()),
          ('Negocio',        'income', v_ingresos_id, true, NOW(), NOW()),
          ('Otros ingresos', 'income', v_ingresos_id, true, NOW(), NOW());

      END $$;
    `);
    const result = await qr.query(`SELECT COUNT(*) as total FROM categories`);
    console.log(`✅ [Migration 2/3] Categorías insertadas: ${result[0].total}\n`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DELETE FROM categories
      WHERE parent_id IN (
        SELECT id FROM categories
        WHERE parent_id IS NULL
          AND name IN (
            'Vivienda', 'Transporte', 'Alimentación', 'Salud',
            'Entretenimiento', 'Restaurantes', 'Compras personales',
            'Viajes', 'Movilidad', 'Ahorros', 'Ingresos'
          )
      );

      DELETE FROM categories
      WHERE parent_id IS NULL
        AND name IN (
          'Vivienda', 'Transporte', 'Alimentación', 'Salud',
          'Entretenimiento', 'Restaurantes', 'Compras personales',
          'Viajes', 'Movilidad', 'Ahorros', 'Ingresos'
        );
    `);
  }
}
