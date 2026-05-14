import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260514000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Enums ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE users_role_enum AS ENUM ('user', 'admin', 'super_admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE accounts_compoundingfrequency_enum AS ENUM ('daily', 'monthly', 'annually');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE accounts_payable_type_enum AS ENUM ('loan', 'credit_card', 'installment', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE accounts_payable_status_enum AS ENUM ('active', 'paid', 'overdue');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE accounts_receivable_status_enum AS ENUM ('pending', 'partial', 'collected', 'overdue');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE bills_frequency_enum AS ENUM ('monthly', 'weekly', 'yearly', 'biweekly');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE budgets_status_enum AS ENUM ('ACTIVE', 'CLOSED', 'PLANNED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE categories_type_enum AS ENUM ('income', 'expense', 'savings');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE categories_bucket_enum AS ENUM ('needs', 'wants');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE expenses_planned_status_enum AS ENUM ('PLANNED', 'PAID', 'CANCELED', 'SKIPPED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE incomes_frequency_enum AS ENUM ('monthly', 'biweekly');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE incomes_planned_status_enum AS ENUM ('PENDING', 'RECEIVED', 'SKIPPED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE planned_savings_status_enum AS ENUM ('pending', 'skipped', 'completed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE saving_goals_status_enum AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE transactions_type_enum AS ENUM ('income', 'expense', 'savings');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Tables (dependency order) ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email        VARCHAR NOT NULL,
        password     VARCHAR,
        provider     VARCHAR NOT NULL DEFAULT 'LOCAL',
        onboarding   VARCHAR NOT NULL DEFAULT 'PENDING',
        token_version INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMP NOT NULL DEFAULT now(),
        updated_at   TIMESTAMP NOT NULL DEFAULT now(),
        role         users_role_enum NOT NULL DEFAULT 'user'::users_role_enum
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id        UUID NOT NULL,
        name           VARCHAR NOT NULL,
        display_name   VARCHAR,
        phone          VARCHAR,
        photo          VARCHAR,
        gender         VARCHAR DEFAULT 'prefer_not_to_say',
        country        CHAR(2),
        type           VARCHAR NOT NULL,
        trial_ends_at  TIMESTAMP,
        is_active      BOOLEAN NOT NULL DEFAULT true,
        created_at     TIMESTAMP NOT NULL DEFAULT now(),
        updated_at     TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finances (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID NOT NULL,
        profile    VARCHAR NOT NULL,
        currency   VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name            VARCHAR NOT NULL,
        type            categories_type_enum NOT NULL,
        bucket          categories_bucket_enum,
        parent_id       UUID,
        "isSelectable"  BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMP NOT NULL DEFAULT now(),
        updated_at      TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name                    VARCHAR NOT NULL,
        description             VARCHAR,
        type                    VARCHAR,
        "interestRate"          NUMERIC(10,4),
        "compoundingFrequency"  accounts_compoundingfrequency_enum NOT NULL DEFAULT 'monthly'::accounts_compoundingfrequency_enum,
        "isActive"              BOOLEAN NOT NULL DEFAULT true,
        is_primary              BOOLEAN NOT NULL DEFAULT false,
        user_id                 UUID NOT NULL,
        created_at              TIMESTAMP NOT NULL DEFAULT now(),
        updated_at              TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_rate_history (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id    UUID NOT NULL,
        previous_rate NUMERIC(6,4) NOT NULL,
        new_rate      NUMERIC(6,4) NOT NULL,
        changed_at    TIMESTAMP NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name                 VARCHAR NOT NULL,
        month                VARCHAR NOT NULL,
        year                 INTEGER NOT NULL DEFAULT 2026,
        strategy             VARCHAR NOT NULL,
        frequency            VARCHAR NOT NULL DEFAULT 'monthly',
        status               budgets_status_enum NOT NULL DEFAULT 'PLANNED'::budgets_status_enum,
        is_shared            BOOLEAN NOT NULL,
        needs                INTEGER NOT NULL,
        wants                INTEGER NOT NULL,
        savings              INTEGER NOT NULL,
        finances_id          VARCHAR NOT NULL,
        "ownerId"            UUID NOT NULL,
        "partnerId"          UUID,
        "updatedBy"          VARCHAR,
        carry_forward_amount NUMERIC(12,2) DEFAULT '0',
        closed_at            TIMESTAMP,
        created_at           TIMESTAMP NOT NULL DEFAULT now(),
        updated_at           TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bills (
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expenses_planned (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        budget_id       UUID NOT NULL,
        bill_id         UUID,
        category_id     UUID NOT NULL,
        name            VARCHAR NOT NULL,
        expected_amount NUMERIC(12,2) NOT NULL,
        due_date        DATE NOT NULL,
        status          expenses_planned_status_enum NOT NULL DEFAULT 'PLANNED'::expenses_planned_status_enum,
        is_essential    BOOLEAN NOT NULL DEFAULT true,
        notes           TEXT,
        created_at      TIMESTAMP NOT NULL DEFAULT now(),
        updated_at      TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source       VARCHAR NOT NULL,
        amount       NUMERIC(12,2) NOT NULL,
        payment_days TEXT NOT NULL,
        frequency    incomes_frequency_enum NOT NULL,
        "isActive"   BOOLEAN NOT NULL DEFAULT true,
        user_id      UUID NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT now(),
        updated_at   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incomes_planned (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        income_source_id UUID,
        budget_id        UUID NOT NULL,
        source_label     VARCHAR,
        amount           NUMERIC NOT NULL,
        date             DATE NOT NULL,
        status           incomes_planned_status_enum NOT NULL DEFAULT 'PENDING'::incomes_planned_status_enum,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount             NUMERIC(12,2) NOT NULL,
        source             VARCHAR NOT NULL,
        description        VARCHAR,
        user_id            VARCHAR NOT NULL,
        budget_id          VARCHAR NOT NULL,
        bill_id            UUID,
        category_id        VARCHAR NOT NULL,
        type               transactions_type_enum NOT NULL,
        account_id         UUID,
        from_account_id    UUID,
        to_account_id      UUID,
        planned_expense_id UUID,
        planned_income_id  UUID,
        transaction_date   DATE NOT NULL,
        nulled_at          DATE,
        created_at         TIMESTAMP NOT NULL DEFAULT now(),
        updated_at         TIMESTAMP NOT NULL DEFAULT now(),
        "userId"           UUID,
        "budgetId"         UUID,
        "categoryId"       UUID,
        "incomeSourceId"   UUID
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saving_goals (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name           VARCHAR NOT NULL,
        reason         VARCHAR,
        "targetAmount" NUMERIC(12,2),
        "targetDate"   DATE,
        user_id        UUID NOT NULL,
        account_id     UUID NOT NULL,
        "isActive"     BOOLEAN NOT NULL DEFAULT true,
        created_at     TIMESTAMP NOT NULL DEFAULT now(),
        updated_at     TIMESTAMP NOT NULL DEFAULT now(),
        status         saving_goals_status_enum NOT NULL DEFAULT 'SCHEDULED'::saving_goals_status_enum
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saving_allocations (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        percentage NUMERIC(5,2) NOT NULL,
        goal_id    UUID NOT NULL,
        budget_id  UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS planned_savings (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount            NUMERIC(12,2) NOT NULL,
        status            planned_savings_status_enum NOT NULL DEFAULT 'pending'::planned_savings_status_enum,
        "isAutoGenerated" BOOLEAN NOT NULL DEFAULT true,
        date              DATE NOT NULL,
        created_at        TIMESTAMP NOT NULL DEFAULT now(),
        updated_at        TIMESTAMP NOT NULL DEFAULT now(),
        "budgetId"        UUID,
        "plannedIncomeId" UUID,
        "savingGoalId"    UUID,
        "accountId"       UUID,
        completed_at      TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS goal_history (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        goal_id    VARCHAR NOT NULL,
        user_id    VARCHAR NOT NULL,
        field      VARCHAR NOT NULL,
        old_value  VARCHAR,
        new_value  VARCHAR NOT NULL,
        changed_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS financial_health_scores (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         VARCHAR NOT NULL,
        total_score     INTEGER NOT NULL,
        cash_flow_score INTEGER NOT NULL,
        savings_score   INTEGER NOT NULL,
        expense_score   INTEGER NOT NULL,
        debt_score      INTEGER NOT NULL,
        level           VARCHAR NOT NULL,
        calculated_at   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts_payable (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id           UUID NOT NULL,
        name              VARCHAR NOT NULL,
        description       VARCHAR,
        type              accounts_payable_type_enum NOT NULL DEFAULT 'other'::accounts_payable_type_enum,
        original_amount   NUMERIC(12,2) NOT NULL,
        current_balance   NUMERIC(12,2) NOT NULL,
        minimum_payment   NUMERIC(12,2),
        interest_rate     NUMERIC(6,4),
        due_date          DATE,
        next_payment_date DATE,
        status            accounts_payable_status_enum NOT NULL DEFAULT 'active'::accounts_payable_status_enum,
        nulled_at         TIMESTAMP,
        created_at        TIMESTAMP NOT NULL DEFAULT now(),
        updated_at        TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_payable_payments (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_payable_id  UUID NOT NULL,
        amount              NUMERIC(12,2) NOT NULL,
        payment_date        DATE NOT NULL,
        notes               VARCHAR,
        created_at          TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts_receivable (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID NOT NULL,
        name            VARCHAR NOT NULL,
        description     VARCHAR,
        debtor          VARCHAR,
        original_amount NUMERIC(12,2) NOT NULL,
        current_balance NUMERIC(12,2) NOT NULL,
        due_date        DATE,
        status          accounts_receivable_status_enum NOT NULL DEFAULT 'pending'::accounts_receivable_status_enum,
        nulled_at       TIMESTAMP,
        created_at      TIMESTAMP NOT NULL DEFAULT now(),
        updated_at      TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_receivable_collections (
        id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_receivable_id   UUID NOT NULL,
        amount                  NUMERIC(12,2) NOT NULL,
        collection_date         DATE NOT NULL,
        notes                   VARCHAR,
        created_at              TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key        VARCHAR UNIQUE NOT NULL,
        response   TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Unique constraints ─────────────────────────────────────────────────
    // Unique constraints back a backing index (relation), so PostgreSQL raises
    // SQLSTATE 42P07 (duplicate_table) — not 42710 (duplicate_object) — when
    // the name already exists. CREATE UNIQUE INDEX IF NOT EXISTS is natively
    // idempotent and avoids that mismatch entirely.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_97672ac88f789774dd47f7c8be3" ON users (email)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_396a36bbb293f255464cff7acf4" ON finances (user_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_eee360f3bff24af1b6890765201" ON user_profile (user_id)
    `);

    // ── Foreign keys ───────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE user_profile ADD CONSTRAINT "FK_eee360f3bff24af1b6890765201"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE finances ADD CONSTRAINT "FK_396a36bbb293f255464cff7acf4"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE categories ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40"
          FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE accounts ADD CONSTRAINT "FK_3000dad1da61b29953f07476324"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE account_rate_history ADD CONSTRAINT "FK_28e18b3945f112554c347351d7a"
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE budgets ADD CONSTRAINT "FK_b7a5f84881508617ce55a0f2d20"
          FOREIGN KEY ("ownerId") REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE budgets ADD CONSTRAINT "FK_ca6a0e423a224660dff1d606a4d"
          FOREIGN KEY ("partnerId") REFERENCES users(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE bills ADD CONSTRAINT "FK_dd941796f5112bc83a7bf499f86"
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE bills ADD CONSTRAINT "FK_467bc46addf91881ec707f84601"
          FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE expenses_planned ADD CONSTRAINT "FK_f29258daa7ae1d75c6f95458765"
          FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE expenses_planned ADD CONSTRAINT "FK_3feb7571bd78fdcd8e9730ceaac"
          FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE expenses_planned ADD CONSTRAINT "FK_ffcb9a819d0a29bd1c681705b82"
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE incomes ADD CONSTRAINT "FK_400664fad260d8fa50ecb78ffe6"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE incomes_planned ADD CONSTRAINT "FK_2cdfdead3b0a8713c42dbd4ac44"
          FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE incomes_planned ADD CONSTRAINT "FK_7ca457fc1c8fa3cf71c79749014"
          FOREIGN KEY (income_source_id) REFERENCES incomes(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_9552f6354aafa8f1818aa571aaf"
          FOREIGN KEY ("budgetId") REFERENCES budgets(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64"
          FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_d759712ba7e7fb10f5c147bdd1f"
          FOREIGN KEY ("incomeSourceId") REFERENCES incomes(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_186ddd4679c49cd78a937d25b1d"
          FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_49c0d6e8ba4bfb5582000d851f0"
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_91ac87a22755563425b98ffc3c0"
          FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_d81b9f7079880ed2c82d60a94b9"
          FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_c028cec86a10c999ccfd42105ac"
          FOREIGN KEY (planned_expense_id) REFERENCES expenses_planned(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD CONSTRAINT "FK_86a6636771452104e4430ebb09c"
          FOREIGN KEY (planned_income_id) REFERENCES incomes_planned(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE saving_goals ADD CONSTRAINT "FK_07ae72049a4028f3f49d8efefd8"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE saving_goals ADD CONSTRAINT "FK_ef284108dd103064841fac929c8"
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE saving_allocations ADD CONSTRAINT "FK_86e1b561e65de2d494c882d6f0f"
          FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE saving_allocations ADD CONSTRAINT "FK_74b9fded65e86708dd9496d8a18"
          FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE planned_savings ADD CONSTRAINT "FK_9b3708aad3fcd093eff0e3664a0"
          FOREIGN KEY ("budgetId") REFERENCES budgets(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE planned_savings ADD CONSTRAINT "FK_a2150b2b5ad31eb2ac03da55db9"
          FOREIGN KEY ("plannedIncomeId") REFERENCES incomes_planned(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE planned_savings ADD CONSTRAINT "FK_ee631d192fcbd4486412b88edba"
          FOREIGN KEY ("savingGoalId") REFERENCES saving_goals(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE planned_savings ADD CONSTRAINT "FK_91af26a377d44633f8e552e9b82"
          FOREIGN KEY ("accountId") REFERENCES accounts(id) ON DELETE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE accounts_payable ADD CONSTRAINT "FK_aee938a0dde00f8588dc6340bdc"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE account_payable_payments ADD CONSTRAINT "FK_8ada8f3b4e275135bfb4bc872a1"
          FOREIGN KEY (account_payable_id) REFERENCES accounts_payable(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE accounts_receivable ADD CONSTRAINT "FK_001c95f1073602daa4371539d33"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE account_receivable_collections ADD CONSTRAINT "FK_2fdd63a2971ef04ae288c49927c"
          FOREIGN KEY (account_receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Idempotency keys index (complementary to CreateIdempotencyKeys migration) ──
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys (expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS account_receivable_collections CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts_receivable CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_payable_payments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts_payable CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS financial_health_scores CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS goal_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS planned_savings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS saving_allocations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS saving_goals CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS transactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS incomes_planned CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS incomes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS expenses_planned CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS bills CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS budgets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_rate_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finances CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_profile CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);

    await queryRunner.query(`DROP TYPE IF EXISTS transactions_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS saving_goals_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS planned_savings_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS incomes_planned_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS incomes_frequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS expenses_planned_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS categories_bucket_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS categories_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS budgets_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS bills_frequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_receivable_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_payable_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_payable_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_compoundingfrequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS users_role_enum`);
  }
}
