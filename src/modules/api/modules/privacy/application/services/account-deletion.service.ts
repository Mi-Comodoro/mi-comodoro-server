import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { DataSource, EntityManager } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import {
  DELETED_USER_ID,
  DELETION_CONFIRMATION_PHRASE,
  getRetentionDays,
} from '../../privacy.constants';

export interface DeletionStatus {
  requested: boolean;
  requestedAt: Date | null;
  scheduledAt: Date | null;
  /** Días que quedan antes del borrado permanente (null si no hay solicitud) */
  daysLeft: number | null;
}

interface DeletionRow {
  deletion_requested_at: Date | null;
  deletion_scheduled_at: Date | null;
}

// Con PostgreSQL, TypeORM devuelve un UPDATE ... RETURNING como [filas, cantidad]; un SELECT, como filas
const firstRow = <T>(result: unknown): T | undefined => {
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  return Array.isArray(rows) ? (rows[0] as T | undefined) : undefined;
};

const toStatus = (row?: DeletionRow | null, now = new Date()): DeletionStatus => {
  const requestedAt = row?.deletion_requested_at ?? null;
  const scheduledAt = row?.deletion_scheduled_at ?? null;
  return {
    requested: Boolean(requestedAt),
    requestedAt,
    scheduledAt,
    daysLeft: scheduledAt
      ? Math.max(0, Math.ceil((new Date(scheduledAt).getTime() - now.getTime()) / 86_400_000))
      : null,
  };
};

/**
 * Derecho de supresión (Ley 1581 de 2012).
 *
 * 1. La persona lo solicita escribiendo una frase de confirmación: la cuenta queda programada para
 *    borrarse en 90 días, se cierran sus sesiones y puede cancelar iniciando sesión de nuevo.
 * 2. Pasado el plazo, una tarea diaria borra la cuenta de forma permanente.
 *
 * El esquema tiene pocas llaves foráneas hacia usuarios: 11 tablas guardan el identificador sin
 * restricción, así que borrar la fila de `users` NO bastaría (ver purgeUser).
 */
@Injectable()
export class AccountDeletionService {
  private readonly context = AccountDeletionService.name;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerProviderService,
  ) {}

  async getStatus(userId: string): Promise<DeletionStatus> {
    const [row] = await this.dataSource.query<DeletionRow[]>(
      'SELECT deletion_requested_at, deletion_scheduled_at FROM users WHERE id = $1',
      [userId],
    );
    return toStatus(row);
  }

  /**
   * Grupos de los que la persona es organizadora y en los que hay más gente. Antes de eliminarse debe
   * traspasar la organización o eliminar el grupo: no se decide por las demás personas.
   */
  async findBlockingGroups(
    userId: string,
    manager: Pick<EntityManager, 'query'> = this.dataSource,
  ): Promise<{ id: string; name: string }[]> {
    return await manager.query(
      `SELECT g.id, g.name
         FROM user_groups g
        WHERE g.owner_id = $1
          AND g.nulled_at IS NULL
          AND EXISTS (
            SELECT 1 FROM group_members m
             WHERE m.group_id = g.id
               AND m.user_id IS NOT NULL AND m.user_id <> $1
               AND m.is_active = true AND m.nulled_at IS NULL
          )`,
      [userId],
    );
  }

  async requestDeletion(userId: string, confirmation: string): Promise<DeletionStatus> {
    if (confirmation?.trim().toUpperCase() !== DELETION_CONFIRMATION_PHRASE) {
      throw new BadRequestException(
        `Para confirmar escribe exactamente: ${DELETION_CONFIRMATION_PHRASE}`,
      );
    }

    const blocking = await this.findBlockingGroups(userId);
    if (blocking.length > 0) {
      throw new ConflictException(
        `Eres organizador de ${blocking.length === 1 ? 'un grupo' : `${blocking.length} grupos`} con ` +
          `otras personas (${blocking.map((group) => group.name).join(', ')}). Traspasa la ` +
          'organización o elimina el grupo antes de eliminar tu cuenta.',
      );
    }

    const days = getRetentionDays();
    const row = await this.dataSource.transaction(async (manager) => {
      const updated = firstRow<DeletionRow>(
        await manager.query(
          `UPDATE users
            SET deletion_requested_at = now(),
                deletion_scheduled_at = now() + make_interval(days => $2),
                token_version = token_version + 1
          WHERE id = $1 AND deletion_requested_at IS NULL
        RETURNING deletion_requested_at, deletion_scheduled_at`,
          [userId, days],
        ),
      );
      if (!updated) return null; // ya estaba solicitada

      // Cierra todas las sesiones: la persona vuelve a entrar si quiere cancelar
      await manager.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId],
      );
      return updated;
    });

    this.logger.info(
      this.context,
      `Eliminación programada para el usuario ${userId} (${days} días)`,
    );
    return row ? toStatus(row) : await this.getStatus(userId);
  }

  async cancelDeletion(userId: string): Promise<DeletionStatus> {
    await this.dataSource.query(
      `UPDATE users SET deletion_requested_at = NULL, deletion_scheduled_at = NULL
        WHERE id = $1 AND deletion_requested_at IS NOT NULL`,
      [userId],
    );
    this.logger.info(this.context, `Eliminación cancelada para el usuario ${userId}`);
    return await this.getStatus(userId);
  }

  /** Borra las cuentas cuyo plazo venció. Cada una en su propia transacción: un fallo no frena a las demás. */
  async purgeDue(now = new Date()): Promise<{ purged: number; failed: number }> {
    const due = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM users
        WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= $1 AND id <> $2
        ORDER BY deletion_scheduled_at LIMIT 50`,
      [now, DELETED_USER_ID],
    );

    let purged = 0;
    let failed = 0;
    for (const { id } of due) {
      try {
        await this.purgeUser(id);
        purged += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(this.context, `No se pudo borrar la cuenta ${id}`, String(error));
      }
    }
    if (due.length > 0) {
      this.logger.info(this.context, `Borrado permanente: ${purged} cuentas, ${failed} con error`);
    }
    return { purged, failed };
  }

  /**
   * Borrado permanente de una cuenta, en una sola transacción.
   *
   * Orden y motivo de cada paso (el esquema casi no tiene llaves foráneas hacia users):
   * 1. Grupos que organiza: si queda otra persona activa se traspasa la organización; si no, se borra el grupo.
   * 2. Registros compartidos con otras personas (gastos del grupo, aportes, reparto de gastos de viaje)
   *    se reasignan a «Persona eliminada»: las cuentas de las demás no cambian.
   * 3. Se retira de los grupos y de los presupuestos compartidos (partner_id).
   * 4. Se borran las tablas que guardan su identificador sin llave foránea y las dependencias sin cascada.
   * 5. Se borra la fila de users: las demás tablas (cuentas, presupuestos, movimientos, metas…) caen en cascada.
   */
  async purgeUser(userId: string): Promise<void> {
    if (userId === DELETED_USER_ID) return;

    const [account] = await this.dataSource.query<{ email: string; provider: string }[]>(
      'SELECT email, provider FROM users WHERE id = $1',
      [userId],
    );
    if (!account) return;

    await this.dataSource.transaction(async (manager) => {
      const q = (sql: string, params: unknown[] = [userId]) => manager.query(sql, params);

      // 1. Grupos que organiza
      const owned: { id: string }[] = await q(
        'SELECT id FROM user_groups WHERE owner_id = $1 AND nulled_at IS NULL',
      );
      for (const group of owned) {
        const [next] = await q(
          `SELECT user_id FROM group_members
            WHERE group_id = $1 AND user_id IS NOT NULL AND user_id <> $2
              AND is_active = true AND nulled_at IS NULL
            ORDER BY (role = 'CO_ORGANIZER') DESC, joined_at ASC LIMIT 1`,
          [group.id, userId],
        );
        if (next) {
          await q('UPDATE user_groups SET owner_id = $1 WHERE id = $2', [next.user_id, group.id]);
          await q(
            `UPDATE group_members SET role = 'ORGANIZER' WHERE group_id = $1 AND user_id = $2`,
            [group.id, next.user_id],
          );
        } else {
          await this.deleteGroup(manager, group.id);
        }
      }
      // Grupos ya cerrados que aún apuntan a la persona como dueña
      await q('UPDATE user_groups SET owner_id = $1 WHERE owner_id = $2', [
        DELETED_USER_ID,
        userId,
      ]);

      // 2. Registros compartidos: se reasignan a «Persona eliminada»
      // Se sueltan también los vínculos con movimientos y deudas de la persona, que van a desaparecer
      await q(
        `UPDATE group_expenses
            SET responsible_user_id = $1, transaction_id = NULL, cxp_id = NULL, cxc_id = NULL
          WHERE responsible_user_id = $2`,
        [DELETED_USER_ID, userId],
      );
      await q('UPDATE group_contributions SET user_id = $1 WHERE user_id = $2', [
        DELETED_USER_ID,
        userId,
      ]);
      await q('UPDATE travel_expenses SET paid_by = $1 WHERE paid_by = $2', [
        DELETED_USER_ID,
        userId,
      ]);
      await q('UPDATE travel_expense_assignments SET user_id = $1 WHERE user_id = $2', [
        DELETED_USER_ID,
        userId,
      ]);

      // 3. Fuera de los grupos y de los presupuestos de otras personas
      await q('DELETE FROM group_members WHERE user_id = $1');
      await q('UPDATE budgets SET partner_id = NULL WHERE partner_id = $1');

      // 4. Tablas que guardan el identificador sin llave foránea
      for (const table of [
        'financial_health_scores',
        'goal_history',
        'refresh_tokens',
        'user_settings',
      ]) {
        await q(`DELETE FROM ${table} WHERE user_id = $1`);
      }
      // La solicitud de acceso a la beta apunta a la persona con otro nombre de columna
      await q('DELETE FROM beta_access_requests WHERE registered_user_id = $1');

      // 4b. Dependencias SIN borrado en cascada (NO ACTION). PostgreSQL revisa esas llaves en medio de
      //     la cascada, así que hay que borrarlas antes, de abajo hacia arriba: movimientos y ahorros
      //     planificados referencian cuentas, facturas, ingresos y gastos planificados.
      await q('DELETE FROM transactions WHERE user_id = $1');
      await q(
        `DELETE FROM planned_savings
          WHERE budget_id IN (SELECT id FROM budgets WHERE owner_id = $1)
             OR saving_goal_id IN (SELECT id FROM saving_goals WHERE user_id = $1)
             OR account_id IN (SELECT id FROM accounts WHERE user_id = $1)`,
      );

      // 5. La cuenta: el resto cae en cascada
      await q('DELETE FROM users WHERE id = $1');
    });

    this.logger.info(this.context, `Cuenta ${userId} borrada de forma permanente`);

    // El acceso con Google guarda además un registro en Firebase (correo, nombre, foto)
    if (account.provider === 'GOOGLE') await this.deleteFirebaseUser(account.email, userId);
  }

  private async deleteGroup(manager: EntityManager, groupId: string): Promise<void> {
    await manager.query(
      `DELETE FROM travel_expense_assignments
        WHERE expense_id IN (SELECT id FROM travel_expenses WHERE group_id = $1)`,
      [groupId],
    );
    for (const table of [
      'travel_expenses',
      'group_expenses',
      'group_contributions',
      'group_members',
    ]) {
      await manager.query(`DELETE FROM ${table} WHERE group_id = $1`, [groupId]);
    }
    await manager.query('DELETE FROM user_groups WHERE id = $1', [groupId]);
  }

  private async deleteFirebaseUser(email: string, userId: string): Promise<void> {
    try {
      if (getApps().length === 0) return;
      const auth = getAuth();
      const record = await auth.getUserByEmail(email);
      await auth.deleteUser(record.uid);
    } catch (error) {
      // No bloquea: la cuenta de la aplicación ya se borró. Se registra sin el correo.
      this.logger.warn(
        this.context,
        `No se pudo borrar el registro de Firebase del usuario ${userId}: ${(error as { code?: string }).code ?? 'error'}`,
      );
    }
  }
}
