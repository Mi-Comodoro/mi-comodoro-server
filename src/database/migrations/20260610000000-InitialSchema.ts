import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260610000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('\n🗄️  [Migration 1/3] Creando schema inicial...');
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Enums ──────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE users_role_enum AS ENUM ('user', 'admin', 'super_admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE account_type_enum AS ENUM ('TRIAL', 'FREE', 'PLUS', 'PRO', 'PARTNER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE accounts_compoundingfrequency_enum AS ENUM ('daily', 'monthly', 'annually');
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
        CREATE TYPE bills_frequency_enum AS ENUM ('monthly', 'yearly');
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
        CREATE TYPE transactions_type_enum AS ENUM ('income', 'expense', 'savings', 'interest');
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
        CREATE TYPE friendship_status_enum AS ENUM ('pending', 'accepted', 'blocked');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type_enum AS ENUM (
          'friend_request', 'friend_accepted', 'friend_rejected',
          'announcement', 'payment_received',
          'group_trip_invitation', 'group_trip_accepted'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE group_type AS ENUM ('SHARED', 'FAMILIAR', 'TRAVEL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE group_status AS ENUM ('Planificando', 'Activo', 'Cerrado');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE member_role AS ENUM ('ORGANIZER', 'CO_ORGANIZER', 'MEMBER', 'VIEWER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE member_status_enum AS ENUM ('active', 'invited', 'external');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE travel_expenses_split_type_enum AS ENUM ('EQUAL', 'CUSTOM', 'PERCENTAGE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE group_expense_status_enum AS ENUM ('planned', 'paid', 'cxp');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Tables (orden de dependencias) ─────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        email         VARCHAR     NOT NULL UNIQUE,
        password      VARCHAR,
        provider      VARCHAR     NOT NULL DEFAULT 'LOCAL',
        onboarding    VARCHAR     NOT NULL DEFAULT 'PENDING',
        token_version INTEGER     NOT NULL DEFAULT 0,
        role          users_role_enum NOT NULL DEFAULT 'user',
        handle        VARCHAR(20) UNIQUE,
        nulled_at     TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id           UUID            NOT NULL UNIQUE,
        name              VARCHAR         NOT NULL,
        display_name      VARCHAR,
        phone             VARCHAR,
        photo             VARCHAR,
        gender            VARCHAR         DEFAULT 'prefer_not_to_say',
        country           CHAR(2),
        type              account_type_enum NOT NULL DEFAULT 'TRIAL',
        trial_ends_at     TIMESTAMP,
        is_active         BOOLEAN         NOT NULL DEFAULT true,
        is_phone_verified BOOLEAN         NOT NULL DEFAULT false,
        phone_verified_at TIMESTAMPTZ,
        created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "FK_user_profile_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS finances (
        id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID    NOT NULL UNIQUE,
        profile    VARCHAR NOT NULL,
        currency   VARCHAR NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_finances_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id           UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
        name         VARCHAR                NOT NULL,
        type         categories_type_enum   NOT NULL,
        bucket       categories_bucket_enum,
        parent_id    UUID,
        is_selectable BOOLEAN              NOT NULL DEFAULT true,
        nulled_at    TIMESTAMPTZ,
        created_at   TIMESTAMPTZ           NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ           NOT NULL DEFAULT now(),
        CONSTRAINT "FK_categories_parent" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id                    UUID                           PRIMARY KEY DEFAULT uuid_generate_v4(),
        name                  VARCHAR                        NOT NULL,
        description           VARCHAR,
        type                  VARCHAR,
        interest_rate         NUMERIC(10,4),
        compounding_frequency accounts_compoundingfrequency_enum NOT NULL DEFAULT 'monthly',
        is_active             BOOLEAN                        NOT NULL DEFAULT true,
        is_primary            BOOLEAN                        NOT NULL DEFAULT false,
        user_id               UUID                           NOT NULL,
        created_at            TIMESTAMPTZ                    NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ                    NOT NULL DEFAULT now(),
        CONSTRAINT "FK_accounts_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_rate_history (
        id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id    UUID    NOT NULL,
        previous_rate NUMERIC(6,4) NOT NULL,
        new_rate      NUMERIC(6,4) NOT NULL,
        changed_at    TIMESTAMPTZ NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_account_rate_history_account" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id                   UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
        name                 VARCHAR           NOT NULL,
        month                VARCHAR           NOT NULL,
        year                 INTEGER           NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
        strategy             VARCHAR           NOT NULL,
        frequency            VARCHAR           NOT NULL DEFAULT 'monthly',
        status               budgets_status_enum NOT NULL DEFAULT 'PLANNED',
        is_shared            BOOLEAN           NOT NULL DEFAULT false,
        is_default           BOOLEAN           NOT NULL DEFAULT false,
        needs                NUMERIC(12,2)     NOT NULL,
        wants                NUMERIC(12,2)     NOT NULL,
        savings              NUMERIC(12,2)     NOT NULL,
        finances_id          UUID              NOT NULL,
        owner_id             UUID              NOT NULL,
        partner_id           UUID,
        updated_by           VARCHAR,
        carry_forward_amount NUMERIC(12,2)     DEFAULT 0,
        currency             VARCHAR(3)        NOT NULL DEFAULT 'COP',
        nulled_at            TIMESTAMPTZ,
        closed_at            TIMESTAMPTZ,
        created_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "FK_budgets_owner"   FOREIGN KEY (owner_id)   REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT "FK_budgets_partner" FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id              UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID               NOT NULL,
        category_id     UUID               NOT NULL,
        name            VARCHAR            NOT NULL,
        expected_amount NUMERIC(12,2)      NOT NULL,
        billing_day     INTEGER            NOT NULL,
        frequency       bills_frequency_enum NOT NULL,
        is_active       BOOLEAN            NOT NULL DEFAULT true,
        is_paid         BOOLEAN            NOT NULL DEFAULT false,
        created_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
        CONSTRAINT "FK_bills_user"     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
        CONSTRAINT "FK_bills_category" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expenses_planned (
        id              UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
        budget_id       UUID                        NOT NULL,
        bill_id         UUID,
        category_id     UUID                        NOT NULL,
        name            VARCHAR                     NOT NULL,
        expected_amount NUMERIC(12,2)               NOT NULL,
        due_date        DATE                        NOT NULL,
        status          expenses_planned_status_enum NOT NULL DEFAULT 'PLANNED',
        is_essential    BOOLEAN                     NOT NULL DEFAULT true,
        notes           TEXT,
        group_id        UUID,
        created_at      TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        CONSTRAINT "FK_expenses_planned_budget"   FOREIGN KEY (budget_id)   REFERENCES budgets(id)    ON DELETE CASCADE,
        CONSTRAINT "FK_expenses_planned_bill"     FOREIGN KEY (bill_id)     REFERENCES bills(id)      ON DELETE SET NULL,
        CONSTRAINT "FK_expenses_planned_category" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id           UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
        source       VARCHAR               NOT NULL,
        amount       NUMERIC(12,2)         NOT NULL,
        payment_days TEXT                  NOT NULL,
        frequency    incomes_frequency_enum NOT NULL,
        is_active    BOOLEAN               NOT NULL DEFAULT true,
        user_id      UUID                  NOT NULL,
        created_at   TIMESTAMPTZ           NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ           NOT NULL DEFAULT now(),
        CONSTRAINT "FK_incomes_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incomes_planned (
        id               UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
        income_source_id UUID,
        budget_id        UUID                        NOT NULL,
        source_label     VARCHAR,
        amount           NUMERIC                     NOT NULL,
        date             DATE                        NOT NULL,
        status           incomes_planned_status_enum NOT NULL DEFAULT 'PENDING',
        created_at       TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        CONSTRAINT "FK_incomes_planned_budget"      FOREIGN KEY (budget_id)        REFERENCES budgets(id) ON DELETE CASCADE,
        CONSTRAINT "FK_incomes_planned_income_src"  FOREIGN KEY (income_source_id) REFERENCES incomes(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saving_goals (
        id                 UUID                     PRIMARY KEY DEFAULT uuid_generate_v4(),
        name               VARCHAR                  NOT NULL,
        reason             VARCHAR,
        target_amount      NUMERIC(12,2),
        target_date        DATE,
        user_id            UUID                     NOT NULL,
        account_id         UUID                     NOT NULL,
        is_active          BOOLEAN                  NOT NULL DEFAULT true,
        status             saving_goals_status_enum NOT NULL DEFAULT 'SCHEDULED',
        nulled_at          TIMESTAMPTZ,
        last_interest_date DATE,
        created_at         TIMESTAMPTZ              NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ              NOT NULL DEFAULT now(),
        CONSTRAINT "FK_saving_goals_user"    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
        CONSTRAINT "FK_saving_goals_account" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saving_allocations (
        id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        percentage NUMERIC(5,2) NOT NULL,
        goal_id    UUID    NOT NULL,
        budget_id  UUID    NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_saving_allocations_budget" FOREIGN KEY (budget_id) REFERENCES budgets(id)      ON DELETE CASCADE,
        CONSTRAINT "FK_saving_allocations_goal"   FOREIGN KEY (goal_id)   REFERENCES saving_goals(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS planned_savings (
        id                UUID                       PRIMARY KEY DEFAULT uuid_generate_v4(),
        budget_id         UUID                       NOT NULL,
        planned_income_id UUID,
        saving_goal_id    UUID,
        account_id        UUID,
        amount            NUMERIC(12,2)              NOT NULL,
        status            planned_savings_status_enum NOT NULL DEFAULT 'pending',
        is_auto_generated BOOLEAN                    NOT NULL DEFAULT true,
        date              DATE                       NOT NULL,
        completed_at      TIMESTAMPTZ,
        created_at        TIMESTAMPTZ                NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ                NOT NULL DEFAULT now(),
        CONSTRAINT "FK_planned_savings_budget"       FOREIGN KEY (budget_id)         REFERENCES budgets(id)         ON DELETE NO ACTION,
        CONSTRAINT "FK_planned_savings_income"       FOREIGN KEY (planned_income_id) REFERENCES incomes_planned(id) ON DELETE NO ACTION,
        CONSTRAINT "FK_planned_savings_goal"         FOREIGN KEY (saving_goal_id)    REFERENCES saving_goals(id)    ON DELETE NO ACTION,
        CONSTRAINT "FK_planned_savings_account"      FOREIGN KEY (account_id)        REFERENCES accounts(id)        ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id                 UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount             NUMERIC(12,2)         NOT NULL,
        source             VARCHAR               NOT NULL,
        description        VARCHAR,
        user_id            UUID                  NOT NULL,
        budget_id          UUID                  NOT NULL,
        bill_id            UUID,
        category_id        UUID,
        type               transactions_type_enum NOT NULL,
        account_id         UUID,
        from_account_id    UUID,
        to_account_id      UUID,
        planned_expense_id UUID                  UNIQUE,
        planned_income_id  UUID                  UNIQUE,
        planned_saving_id  UUID                  UNIQUE,
        saving_goal_id     UUID,
        income_source_id   UUID,
        transaction_date   DATE                  NOT NULL,
        nulled_at          DATE,
        created_at         TIMESTAMPTZ           NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ           NOT NULL DEFAULT now(),
        CONSTRAINT "FK_transactions_user"     FOREIGN KEY (user_id)            REFERENCES users(id)           ON DELETE CASCADE,
        CONSTRAINT "FK_transactions_budget"   FOREIGN KEY (budget_id)          REFERENCES budgets(id)         ON DELETE CASCADE,
        CONSTRAINT "FK_transactions_category" FOREIGN KEY (category_id)        REFERENCES categories(id)      ON DELETE NO ACTION,
        CONSTRAINT "FK_transactions_income_src" FOREIGN KEY (income_source_id) REFERENCES incomes(id)         ON DELETE NO ACTION,
        CONSTRAINT "FK_transactions_bill"     FOREIGN KEY (bill_id)            REFERENCES bills(id)           ON DELETE NO ACTION,
        CONSTRAINT "FK_transactions_account"  FOREIGN KEY (account_id)         REFERENCES accounts(id)        ON DELETE NO ACTION,
        CONSTRAINT "FK_transactions_from_acc" FOREIGN KEY (from_account_id)    REFERENCES accounts(id)        ON DELETE NO ACTION,
        CONSTRAINT "FK_transactions_to_acc"   FOREIGN KEY (to_account_id)      REFERENCES accounts(id)        ON DELETE NO ACTION,
        CONSTRAINT "FK_transactions_pl_exp"   FOREIGN KEY (planned_expense_id) REFERENCES expenses_planned(id) ON DELETE NO ACTION,
        CONSTRAINT "FK_transactions_pl_inc"   FOREIGN KEY (planned_income_id)  REFERENCES incomes_planned(id) ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS goal_history (
        id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        goal_id    UUID    NOT NULL,
        user_id    UUID    NOT NULL,
        field      VARCHAR NOT NULL,
        old_value  VARCHAR,
        new_value  VARCHAR NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS financial_health_scores (
        id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id             UUID    NOT NULL,
        total_score         INTEGER NOT NULL,
        cash_flow_score     INTEGER NOT NULL,
        savings_score       INTEGER NOT NULL,
        expense_score       INTEGER NOT NULL,
        debt_score          INTEGER NOT NULL,
        level               VARCHAR NOT NULL,
        cash_flow_rate      NUMERIC(10,2),
        savings_rate        NUMERIC(10,2),
        expenses_excess_pct NUMERIC(10,2),
        dti                 NUMERIC(10,2),
        avg_monthly_income  NUMERIC(10,2),
        total_income        BIGINT  DEFAULT 0,
        total_expenses      BIGINT  DEFAULT 0,
        total_savings       BIGINT  DEFAULT 0,
        calculated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts_payable (
        id                UUID                       PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id           UUID                       NOT NULL,
        name              VARCHAR                    NOT NULL,
        description       VARCHAR,
        type              accounts_payable_type_enum NOT NULL DEFAULT 'other',
        original_amount   NUMERIC(12,2)              NOT NULL,
        current_balance   NUMERIC(12,2)              NOT NULL,
        minimum_payment   NUMERIC(12,2),
        interest_rate     NUMERIC(6,4),
        due_date          DATE,
        next_payment_date DATE,
        status            accounts_payable_status_enum NOT NULL DEFAULT 'active',
        linked_cxc_id     VARCHAR,
        nulled_at         TIMESTAMPTZ,
        created_at        TIMESTAMPTZ                NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ                NOT NULL DEFAULT now(),
        CONSTRAINT "FK_accounts_payable_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_payable_payments (
        id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_payable_id UUID    NOT NULL,
        amount             NUMERIC(12,2) NOT NULL,
        payment_date       DATE    NOT NULL,
        notes              VARCHAR,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_payable_payments_payable" FOREIGN KEY (account_payable_id) REFERENCES accounts_payable(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts_receivable (
        id              UUID                          PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID                          NOT NULL,
        name            VARCHAR                       NOT NULL,
        description     VARCHAR,
        debtor          VARCHAR,
        original_amount NUMERIC(12,2)                 NOT NULL,
        current_balance NUMERIC(12,2)                 NOT NULL,
        due_date        DATE,
        status          accounts_receivable_status_enum NOT NULL DEFAULT 'pending',
        linked_cxp_id   VARCHAR,
        nulled_at       TIMESTAMPTZ,
        created_at      TIMESTAMPTZ                   NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ                   NOT NULL DEFAULT now(),
        CONSTRAINT "FK_accounts_receivable_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_receivable_collections (
        id                    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_receivable_id UUID    NOT NULL,
        amount                NUMERIC(12,2) NOT NULL,
        collection_date       DATE    NOT NULL,
        notes                 VARCHAR,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_receivable_collections_receivable" FOREIGN KEY (account_receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id           UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
        requester_id UUID                  NOT NULL,
        addressee_id UUID                  NOT NULL,
        status       friendship_status_enum NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMPTZ           NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ           NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_friendship_pair"    UNIQUE (requester_id, addressee_id),
        CONSTRAINT "FK_friendship_requester" FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT "FK_friendship_addressee" FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID                   NOT NULL,
        type       notification_type_enum NOT NULL,
        payload    JSONB                  NOT NULL DEFAULT '{}',
        is_read    BOOLEAN                NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID    NOT NULL,
        token_hash VARCHAR NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ DEFAULT NULL,
        user_agent VARCHAR     DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        key        VARCHAR UNIQUE NOT NULL,
        response   TEXT    NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        name           VARCHAR      NOT NULL,
        type           group_type   NOT NULL DEFAULT 'SHARED',
        owner_id       UUID         NOT NULL,
        status         group_status NOT NULL DEFAULT 'Activo',
        max_members    INTEGER      NOT NULL DEFAULT 5,
        goal           NUMERIC(14,2),
        destination    VARCHAR,
        estimated_date DATE,
        nulled_at      TIMESTAMPTZ,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id            UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id      UUID               NOT NULL,
        user_id       UUID,
        role          member_role        NOT NULL DEFAULT 'MEMBER',
        member_status member_status_enum NOT NULL DEFAULT 'active',
        is_active     BOOLEAN            NOT NULL DEFAULT true,
        external_name VARCHAR,
        nulled_at     TIMESTAMPTZ,
        joined_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),
        CONSTRAINT "FK_group_members_group" FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS group_expenses (
        id                  UUID                     PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id            UUID                     NOT NULL,
        description         VARCHAR                  NOT NULL,
        amount              NUMERIC(14,2)             NOT NULL,
        due_date            DATE                     NOT NULL,
        responsible_user_id UUID                     NOT NULL,
        status              group_expense_status_enum NOT NULL DEFAULT 'planned',
        transaction_id      UUID,
        cxp_id              UUID,
        cxc_id              UUID,
        nulled_at           TIMESTAMPTZ,
        created_at          TIMESTAMPTZ              NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ              NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS group_contributions (
        id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id     UUID    NOT NULL,
        user_id      UUID    NOT NULL,
        amount       NUMERIC(14,2) NOT NULL,
        budget_id    UUID,
        budget_label VARCHAR,
        nulled_at    TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS travel_expenses (
        id           UUID                           PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id     UUID                           NOT NULL,
        paid_by      UUID                           NOT NULL,
        description  VARCHAR                        NOT NULL,
        amount       NUMERIC(15,2)                  NOT NULL,
        expense_date DATE                           NOT NULL,
        split_type   travel_expenses_split_type_enum NOT NULL DEFAULT 'EQUAL',
        nulled_at    TIMESTAMPTZ,
        created_at   TIMESTAMPTZ                    NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ                    NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS travel_expense_assignments (
        id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        expense_id      UUID    NOT NULL,
        user_id         UUID    NOT NULL,
        assigned_amount NUMERIC(15,2) NOT NULL,
        settled         BOOLEAN NOT NULL DEFAULT false,
        nulled_at       TIMESTAMPTZ,
        CONSTRAINT "FK_travel_assignments_expense" FOREIGN KEY (expense_id) REFERENCES travel_expenses(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id               UUID         NOT NULL UNIQUE,
        currency              VARCHAR      NOT NULL DEFAULT 'COP',
        language              VARCHAR      NOT NULL DEFAULT 'es',
        notifications_enabled BOOLEAN      NOT NULL DEFAULT true,
        budget_alert_threshold INTEGER     NOT NULL DEFAULT 80,
        savings_percentage    NUMERIC(5,2) NOT NULL DEFAULT 20,
        created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        title           VARCHAR NOT NULL,
        body            TEXT    NOT NULL,
        segment         VARCHAR NOT NULL DEFAULT 'all',
        sent_by         VARCHAR NOT NULL,
        sent_at         TIMESTAMPTZ NOT NULL,
        recipient_count INTEGER NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id     VARCHAR NOT NULL,
        admin_handle VARCHAR NOT NULL,
        action       VARCHAR NOT NULL,
        target_id    VARCHAR,
        target_type  VARCHAR,
        before       JSONB,
        after        JSONB,
        ip           VARCHAR,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        name       VARCHAR      NOT NULL,
        price      NUMERIC(10,2) NOT NULL DEFAULT 0,
        currency   VARCHAR      NOT NULL DEFAULT 'COP',
        features   JSONB        NOT NULL DEFAULT '[]',
        is_active  BOOLEAN      NOT NULL DEFAULT true,
        is_public  BOOLEAN      NOT NULL DEFAULT true,
        nulled_at  TIMESTAMPTZ,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key        VARCHAR PRIMARY KEY,
        value      VARCHAR NOT NULL,
        description VARCHAR,
        updated_by  VARCHAR,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── Indexes ────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_budgets_finances_id     ON budgets (finances_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_budgets_owner_id        ON budgets (owner_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transactions_budget_date ON transactions (budget_id, transaction_date, type) WHERE nulled_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transactions_user_date  ON transactions (user_id, transaction_date)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_expenses_planned_budget ON expenses_planned (budget_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_planned_savings_goal    ON planned_savings (saving_goal_id, status, date)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_saving_goals_user       ON saving_goals (user_id, is_active)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_incomes_planned_budget  ON incomes_planned (budget_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_groups_owner       ON user_groups (owner_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_group_members_group     ON group_members (group_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_group_members_user      ON group_members (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash     ON refresh_tokens (token_hash)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user     ON refresh_tokens (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_idempotency_expires     ON idempotency_keys (expires_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_financial_scores_user   ON financial_health_scores (user_id)`,
    );
    console.log('✅ [Migration 1/3] Schema creado: 30 tablas + enums + índices\n');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_financial_scores_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_idempotency_expires`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_refresh_tokens_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_refresh_tokens_hash`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_user_read`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_group_members_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_group_members_group`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_groups_owner`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incomes_planned_budget`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_saving_goals_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_planned_savings_goal`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_expenses_planned_budget`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_user_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_budget_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_budgets_owner_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_budgets_finances_id`);

    // Tables
    await queryRunner.query(`DROP TABLE IF EXISTS system_config CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS plans CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS announcements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS travel_expense_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS travel_expenses CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_contributions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_expenses CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_members CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_groups CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS friendships CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_receivable_collections CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts_receivable CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_payable_payments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts_payable CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS financial_health_scores CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS goal_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS transactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS planned_savings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS saving_allocations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS saving_goals CASCADE`);
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
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);

    // Enums
    await queryRunner.query(`DROP TYPE IF EXISTS group_expense_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS travel_expenses_split_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS member_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS member_role`);
    await queryRunner.query(`DROP TYPE IF EXISTS group_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS group_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS friendship_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_receivable_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_payable_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_payable_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS transactions_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS saving_goals_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS planned_savings_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS incomes_planned_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS incomes_frequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS expenses_planned_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS bills_frequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS categories_bucket_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS categories_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS budgets_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS accounts_compoundingfrequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS account_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS users_role_enum`);
  }
}
