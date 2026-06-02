import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega columnas faltantes en producción tras el despliegue de develop:
 *
 * - accounts_payable:        linked_cxc_id
 * - accounts_receivable:     linked_cxp_id
 * - financial_health_scores: cash_flow_rate, savings_rate, expenses_excess_pct,
 *                            dti, avg_monthly_income, total_income, total_expenses, total_savings
 * - user_groups:             goal, destination, estimated_date + enum status actualizado
 * - group_members:           member_status, external_name + user_id nullable + enum role actualizado
 * - NEW TABLE group_expenses
 * - NEW TABLE group_contributions
 */
export class AddMissingColumnsV220260602000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. accounts_payable — linked_cxc_id
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE accounts_payable
        ADD COLUMN IF NOT EXISTS linked_cxc_id VARCHAR
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. accounts_receivable — linked_cxp_id
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE accounts_receivable
        ADD COLUMN IF NOT EXISTS linked_cxp_id VARCHAR
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. financial_health_scores — nuevas métricas de diagnóstico
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE financial_health_scores
        ADD COLUMN IF NOT EXISTS cash_flow_rate      NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS savings_rate        NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS expenses_excess_pct NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS dti                 NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS avg_monthly_income  NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS total_income        BIGINT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_expenses      BIGINT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_savings       BIGINT DEFAULT 0
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. group_status enum — ampliar con valores en español + migrar filas
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TYPE group_status ADD VALUE IF NOT EXISTS 'Planificando'`);
    await queryRunner.query(`ALTER TYPE group_status ADD VALUE IF NOT EXISTS 'Activo'`);
    await queryRunner.query(`ALTER TYPE group_status ADD VALUE IF NOT EXISTS 'Cerrado'`);

    // PostgreSQL requires enum ADD VALUE to be committed before the new value can be used
    await queryRunner.commitTransaction();
    await queryRunner.startTransaction();

    await queryRunner.query(`
      UPDATE user_groups SET status = 'Activo'  WHERE status = 'active'
    `);
    await queryRunner.query(`
      UPDATE user_groups SET status = 'Cerrado' WHERE status = 'inactive'
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. user_groups — nuevas columnas de viaje/objetivo
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE user_groups
        ADD COLUMN IF NOT EXISTS goal           NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS destination    VARCHAR,
        ADD COLUMN IF NOT EXISTS estimated_date DATE
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 6. member_role enum — renombrar OWNER→ORGANIZER, EDITOR→CO_ORGANIZER, añadir MEMBER
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE member_role RENAME VALUE 'OWNER' TO 'ORGANIZER';
      EXCEPTION WHEN invalid_parameter_value THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE member_role RENAME VALUE 'EDITOR' TO 'CO_ORGANIZER';
      EXCEPTION WHEN invalid_parameter_value THEN NULL; END $$
    `);
    await queryRunner.query(`ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'MEMBER'`);

    // ──────────────────────────────────────────────────────────────────────────
    // 7. group_members — user_id nullable + eliminar unique + nuevas columnas
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE group_members DROP CONSTRAINT uq_group_user;
      EXCEPTION WHEN undefined_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      ALTER TABLE group_members ALTER COLUMN user_id DROP NOT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE member_status_enum AS ENUM ('active', 'invited', 'external');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      ALTER TABLE group_members
        ADD COLUMN IF NOT EXISTS member_status member_status_enum NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS external_name VARCHAR
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 8. NEW TABLE group_expenses
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE group_expense_status AS ENUM ('planned', 'paid', 'cxp');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS group_expenses (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id            UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
        description         VARCHAR NOT NULL,
        amount              NUMERIC(14,2) NOT NULL,
        due_date            DATE NOT NULL,
        responsible_user_id UUID NOT NULL,
        status              group_expense_status NOT NULL DEFAULT 'planned',
        transaction_id      UUID,
        cxp_id              UUID,
        cxc_id              UUID,
        nulled_at           TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ──────────────────────────────────────────────────────────────────────────
    // 9. NEW TABLE group_contributions
    // ──────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS group_contributions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id     UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
        user_id      UUID NOT NULL,
        amount       NUMERIC(14,2) NOT NULL,
        budget_id    UUID,
        budget_label VARCHAR,
        nulled_at    TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS group_contributions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_expenses CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS group_expense_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS member_status_enum`);

    await queryRunner.query(`
      ALTER TABLE group_members
        DROP COLUMN IF EXISTS external_name,
        DROP COLUMN IF EXISTS member_status
    `);

    await queryRunner.query(`
      ALTER TABLE user_groups
        DROP COLUMN IF EXISTS estimated_date,
        DROP COLUMN IF EXISTS destination,
        DROP COLUMN IF EXISTS goal
    `);

    await queryRunner.query(`
      ALTER TABLE financial_health_scores
        DROP COLUMN IF EXISTS cash_flow_rate,
        DROP COLUMN IF EXISTS savings_rate,
        DROP COLUMN IF EXISTS expenses_excess_pct,
        DROP COLUMN IF EXISTS dti,
        DROP COLUMN IF EXISTS avg_monthly_income,
        DROP COLUMN IF EXISTS total_income,
        DROP COLUMN IF EXISTS total_expenses,
        DROP COLUMN IF EXISTS total_savings
    `);

    await queryRunner.query(`
      ALTER TABLE accounts_receivable DROP COLUMN IF EXISTS linked_cxp_id
    `);
    await queryRunner.query(`
      ALTER TABLE accounts_payable DROP COLUMN IF EXISTS linked_cxc_id
    `);
  }
}
