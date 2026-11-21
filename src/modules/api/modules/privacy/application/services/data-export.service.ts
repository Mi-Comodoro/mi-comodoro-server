import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

/**
 * Derecho de acceso (Ley 1581 de 2012): entrega a la persona todos los datos que Mi Comodoro guarda de ella.
 *
 * - Excluye lo que no es un dato suyo ni se puede usar para entrar a su cuenta: el hash de la contraseña
 *   y los hash de los tokens de sesión.
 * - De otras personas solo se incluye el identificador interno (amistades, grupos), nunca su correo ni su nombre.
 */
@Injectable()
export class DataExportService {
  private readonly context = DataExportService.name;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerProviderService,
  ) {}

  private async rows(sql: string, params: unknown[]): Promise<unknown[]> {
    const [result] = await this.dataSource.query<{ data: unknown[] }[]>(
      `SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) AS data FROM (${sql}) t`,
      params,
    );
    return result?.data ?? [];
  }

  async export(userId: string) {
    this.logger.info(this.context, `Exportando los datos del usuario ${userId}`);
    const own = (table: string, column = 'user_id') =>
      this.rows(`SELECT * FROM ${table} WHERE ${column} = $1`, [userId]);
    // Tablas que cuelgan de los presupuestos de la persona
    const ofBudgets = (table: string) =>
      this.rows(
        `SELECT x.* FROM ${table} x WHERE x.budget_id IN (SELECT id FROM budgets WHERE owner_id = $1)`,
        [userId],
      );

    const [account] = await this.rows(
      `SELECT id, email, provider, handle, role, onboarding, timezone, created_at, updated_at,
              deletion_requested_at, deletion_scheduled_at
         FROM users WHERE id = $1`,
      [userId],
    );

    // Solicitud con la que se registró en la beta cerrada (ya no guarda su correo, solo fechas y versión)
    const betaAccess = await this.rows(
      `SELECT policy_version, consent_at, created_at, decided_at, registered_at
         FROM beta_access_requests WHERE registered_user_id = $1`,
      [userId],
    );

    const [
      profile,
      settings,
      consents,
      sessions,
      finances,
      accounts,
      incomes,
      budgets,
      plannedIncomes,
      plannedSavings,
      plannedExpenses,
      transactions,
      goals,
      goalHistory,
      allocations,
      bills,
      accountsPayable,
      accountsReceivable,
      friendships,
      notifications,
      healthScores,
      groups,
      groupExpenses,
      groupContributions,
      travelExpenses,
    ] = await Promise.all([
      own('user_profile'),
      own('user_settings'),
      this.rows(
        'SELECT consent_type, version, accepted_at, ip, user_agent, revoked_at FROM user_consents WHERE user_id = $1',
        [userId],
      ),
      this.rows(
        'SELECT id, user_agent, created_at, expires_at, revoked_at FROM refresh_tokens WHERE user_id = $1',
        [userId],
      ),
      own('finances'),
      own('accounts'),
      own('incomes'),
      this.rows('SELECT * FROM budgets WHERE owner_id = $1 OR partner_id = $1', [userId]),
      ofBudgets('incomes_planned'),
      ofBudgets('planned_savings'),
      ofBudgets('expenses_planned'),
      own('transactions'),
      own('saving_goals'),
      own('goal_history'),
      this.rows(
        `SELECT a.* FROM saving_allocations a
          WHERE a.goal_id IN (SELECT id FROM saving_goals WHERE user_id = $1)`,
        [userId],
      ),
      own('bills'),
      this.rows(
        `SELECT p.*, COALESCE((SELECT jsonb_agg(to_jsonb(pay)) FROM account_payable_payments pay
                                WHERE pay.account_payable_id = p.id), '[]'::jsonb) AS payments
           FROM accounts_payable p WHERE p.user_id = $1`,
        [userId],
      ),
      this.rows(
        `SELECT r.*, COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM account_receivable_collections c
                                WHERE c.account_receivable_id = r.id), '[]'::jsonb) AS collections
           FROM accounts_receivable r WHERE r.user_id = $1`,
        [userId],
      ),
      // De la otra persona solo su identificador interno
      this.rows(
        `SELECT id, status, created_at,
                CASE WHEN requester_id = $1 THEN 'sent' ELSE 'received' END AS direction,
                CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS other_user_id
           FROM friendships WHERE requester_id = $1 OR addressee_id = $1`,
        [userId],
      ),
      own('notifications'),
      own('financial_health_scores'),
      this.rows(
        `SELECT g.id, g.name, g.type, g.status, g.goal, g.destination, g.estimated_date,
                (g.owner_id = $1) AS is_owner, m.role, m.member_status, m.joined_at
           FROM group_members m JOIN user_groups g ON g.id = m.group_id
          WHERE m.user_id = $1`,
        [userId],
      ),
      own('group_expenses', 'responsible_user_id'),
      own('group_contributions'),
      own('travel_expenses', 'paid_by'),
    ]);

    return {
      info: {
        generatedAt: new Date().toISOString(),
        formatVersion: 1,
        note:
          'Estos son los datos personales que Mi Comodoro guarda sobre ti. No incluye tu contraseña ni los ' +
          'identificadores de tus sesiones. De otras personas solo aparece su identificador interno.',
      },
      account,
      profile,
      settings,
      consents,
      betaAccess,
      sessions,
      finances,
      accounts,
      incomes,
      budgets,
      plannedIncomes,
      plannedSavings,
      plannedExpenses,
      transactions,
      goals,
      goalHistory,
      allocations,
      bills,
      accountsPayable,
      accountsReceivable,
      friendships,
      notifications,
      healthScores,
      groups,
      groupExpenses,
      groupContributions,
      travelExpenses,
    };
  }
}
