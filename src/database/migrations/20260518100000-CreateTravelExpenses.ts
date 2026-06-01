import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTravelExpenses20260518100000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DO $$ BEGIN
        CREATE TYPE travel_expenses_split_type_enum AS ENUM ('EQUAL', 'CUSTOM', 'PERCENTAGE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS travel_expenses (
        id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id      UUID          NOT NULL,
        paid_by       UUID          NOT NULL,
        description   VARCHAR       NOT NULL,
        amount        DECIMAL(15,2) NOT NULL,
        expense_date  DATE          NOT NULL,
        split_type    travel_expenses_split_type_enum NOT NULL DEFAULT 'EQUAL',
        nulled_at     TIMESTAMPTZ   DEFAULT NULL,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS travel_expense_assignments (
        id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_id      UUID          NOT NULL REFERENCES travel_expenses(id) ON DELETE CASCADE,
        user_id         UUID          NOT NULL,
        assigned_amount DECIMAL(15,2) NOT NULL,
        settled         BOOLEAN       NOT NULL DEFAULT FALSE,
        nulled_at       TIMESTAMPTZ   DEFAULT NULL
      );
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DROP TABLE IF EXISTS travel_expense_assignments;
      DROP TABLE IF EXISTS travel_expenses;
      DROP TYPE IF EXISTS travel_expenses_split_type_enum;
    `);
  }
}
