import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recrea la tabla bills con la estructura correcta (snake_case).
 * La versión original tenía columnas camelCase ("userId", "categoryId", "dueDate")
 * y frecuencias 'weekly'/'biweekly'. La nueva versión usa user_id, category_id,
 * billing_day y sólo 'monthly'/'yearly'.
 */
export class FixBillsTableStructure20260531100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop any FK from expenses_planned that references bills (varios nombres posibles)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE expenses_planned DROP CONSTRAINT IF EXISTS "FK_3feb7571bd78fdcd8e9730ceaac";
      EXCEPTION WHEN others THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE expenses_planned DROP CONSTRAINT IF EXISTS "FK_expenses_planned_bill";
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // Drop old table (CASCADE removes any remaining dependent FKs)
    await queryRunner.query(`DROP TABLE IF EXISTS bills CASCADE`);

    // Recreate enum with only the two supported values
    await queryRunner.query(`DROP TYPE IF EXISTS bills_frequency_enum`);
    await queryRunner.query(`
      CREATE TYPE bills_frequency_enum AS ENUM ('monthly', 'yearly')
    `);

    // Recreate bills with correct snake_case structure matching BillsEntity
    await queryRunner.query(`
      CREATE TABLE bills (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id          UUID NOT NULL,
        category_id      UUID NOT NULL,
        name             VARCHAR NOT NULL,
        expected_amount  NUMERIC(12,2) NOT NULL,
        billing_day      INTEGER NOT NULL,
        frequency        bills_frequency_enum NOT NULL,
        is_active        BOOLEAN NOT NULL DEFAULT true,
        is_paid          BOOLEAN NOT NULL DEFAULT false,
        created_at       TIMESTAMP NOT NULL DEFAULT now(),
        updated_at       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_bills_user"     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
        CONSTRAINT "FK_bills_category" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      )
    `);

    // Restore FK from expenses_planned.bill_id → bills.id
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE expenses_planned
          ADD CONSTRAINT "FK_expenses_planned_bill"
          FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE expenses_planned DROP CONSTRAINT IF EXISTS "FK_expenses_planned_bill"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS bills CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS bills_frequency_enum`);

    // Restore old structure
    await queryRunner.query(
      `CREATE TYPE bills_frequency_enum AS ENUM ('monthly', 'weekly', 'yearly', 'biweekly')`,
    );
    await queryRunner.query(`
      CREATE TABLE bills (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name             VARCHAR NOT NULL,
        "expectedAmount" NUMERIC(12,2) NOT NULL,
        "dueDate"        TIMESTAMP NOT NULL,
        frequency        bills_frequency_enum NOT NULL,
        is_active        BOOLEAN NOT NULL DEFAULT true,
        is_paid          BOOLEAN NOT NULL DEFAULT true,
        created_at       TIMESTAMP NOT NULL DEFAULT now(),
        updated_at       TIMESTAMP NOT NULL DEFAULT now(),
        "userId"         UUID,
        "categoryId"     UUID
      )
    `);
  }
}
