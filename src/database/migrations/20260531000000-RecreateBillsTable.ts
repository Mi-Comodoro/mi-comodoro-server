import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecreateBillsTable20260531000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old bills table (releases FK on expenses_planned.bill_id)
    await queryRunner.query(`DROP TABLE IF EXISTS bills CASCADE`);

    // Drop old enum and recreate with only the two supported values
    await queryRunner.query(`DROP TYPE IF EXISTS bills_frequency_enum`);
    await queryRunner.query(`CREATE TYPE bills_frequency_enum AS ENUM ('monthly', 'yearly')`);

    // Recreate bills with correct column names matching BillsEntity
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
        CONSTRAINT "FK_bills_user"     FOREIGN KEY (user_id)     REFERENCES users(id)       ON DELETE CASCADE,
        CONSTRAINT "FK_bills_category" FOREIGN KEY (category_id) REFERENCES categories(id)  ON DELETE RESTRICT
      )
    `);

    // Restore FK from expenses_planned.bill_id → bills.id
    await queryRunner.query(`
      ALTER TABLE expenses_planned
        ADD CONSTRAINT "FK_expenses_planned_bill"
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE expenses_planned DROP CONSTRAINT IF EXISTS "FK_expenses_planned_bill"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS bills CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS bills_frequency_enum`);

    // Restore original bills table structure
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
