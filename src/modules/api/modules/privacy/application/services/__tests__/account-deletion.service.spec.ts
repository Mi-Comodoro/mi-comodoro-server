import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { DELETED_USER_ID } from '../../../privacy.constants';
import { AccountDeletionService } from '../account-deletion.service';

const mockDeleteUser = jest.fn();
const mockGetUserByEmail = jest.fn();
jest.mock('firebase-admin/app', () => ({ getApps: () => [{}] }));
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ getUserByEmail: mockGetUserByEmail, deleteUser: mockDeleteUser }),
}));

const mockManager = { query: jest.fn() };
const mockDataSource = {
  query: jest.fn(),
  transaction: jest.fn(async (callback: (manager: typeof mockManager) => unknown) =>
    callback(mockManager),
  ),
};
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const PHRASE = 'ELIMINAR MI CUENTA';
const sqlOf = (call: unknown[]) => String(call[0]).replace(/\s+/g, ' ').trim();

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  const originalDays = process.env.ACCOUNT_DELETION_RETENTION_DAYS;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountDeletionService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();
    service = module.get(AccountDeletionService);
    jest.clearAllMocks();
    delete process.env.ACCOUNT_DELETION_RETENTION_DAYS;
    mockDataSource.query.mockResolvedValue([]);
    mockManager.query.mockResolvedValue([]);
  });

  afterAll(() => {
    process.env.ACCOUNT_DELETION_RETENTION_DAYS = originalDays;
  });

  describe('requestDeletion', () => {
    it('exige escribir la frase de confirmación', async () => {
      await expect(service.requestDeletion('user-1', 'si')).rejects.toThrow(BadRequestException);
      await expect(service.requestDeletion('user-1', '')).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('acepta la frase sin importar mayúsculas ni espacios sobrantes', async () => {
      mockManager.query.mockResolvedValueOnce([
        [{ deletion_requested_at: new Date(), deletion_scheduled_at: new Date() }],
        1,
      ]);
      await expect(
        service.requestDeletion('user-1', `  ${PHRASE.toLowerCase()} `),
      ).resolves.toMatchObject({
        requested: true,
      });
    });

    it('no permite eliminarse a quien organiza un grupo con otras personas', async () => {
      mockDataSource.query.mockResolvedValue([{ id: 'g-1', name: 'Viaje a Cartagena' }]);

      await expect(service.requestDeletion('user-1', PHRASE)).rejects.toThrow(
        /organizador de un grupo.*Viaje a Cartagena/,
      );
      await expect(service.requestDeletion('user-1', PHRASE)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('programa el borrado a 90 días, cierra las sesiones y devuelve la fecha', async () => {
      const scheduled = new Date(Date.now() + 90 * 86_400_000);
      mockManager.query.mockResolvedValueOnce([
        [{ deletion_requested_at: new Date(), deletion_scheduled_at: scheduled }],
        1,
      ]);

      const status = await service.requestDeletion('user-1', PHRASE);

      const [updateCall, revokeCall] = mockManager.query.mock.calls;
      expect(updateCall[1]).toEqual(['user-1', 90]);
      expect(sqlOf(updateCall)).toContain('deletion_scheduled_at = now() + make_interval');
      expect(sqlOf(updateCall)).toContain('token_version = token_version + 1');
      expect(sqlOf(revokeCall)).toContain('UPDATE refresh_tokens SET revoked_at = now()');
      expect(status).toMatchObject({ requested: true, daysLeft: 90 });
    });

    it('el plazo se puede ajustar por entorno y ignora valores inválidos', async () => {
      process.env.ACCOUNT_DELETION_RETENTION_DAYS = '30';
      mockManager.query.mockResolvedValue([[{ deletion_scheduled_at: new Date() }], 1]);
      await service.requestDeletion('user-1', PHRASE);
      expect(mockManager.query.mock.calls[0][1]).toEqual(['user-1', 30]);

      mockManager.query.mockClear();
      process.env.ACCOUNT_DELETION_RETENTION_DAYS = '9999';
      await service.requestDeletion('user-1', PHRASE);
      expect(mockManager.query.mock.calls[0][1]).toEqual(['user-1', 90]);
    });

    it('si ya estaba solicitada no vuelve a tocar nada y devuelve el estado actual', async () => {
      mockManager.query.mockResolvedValueOnce([[], 0]);
      mockDataSource.query
        .mockResolvedValueOnce([]) // grupos que bloquean
        .mockResolvedValueOnce([
          {
            deletion_requested_at: new Date('2026-11-01'),
            deletion_scheduled_at: new Date('2027-01-30'),
          },
        ]);

      const status = await service.requestDeletion('user-1', PHRASE);

      expect(mockManager.query).toHaveBeenCalledTimes(1); // no revoca sesiones de nuevo
      expect(status.requested).toBe(true);
    });
  });

  describe('cancelDeletion / getStatus', () => {
    it('cancelar limpia las fechas y deja de estar solicitada', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // UPDATE
        .mockResolvedValueOnce([{ deletion_requested_at: null, deletion_scheduled_at: null }]);

      const status = await service.cancelDeletion('user-1');

      expect(sqlOf(mockDataSource.query.mock.calls[0])).toContain('deletion_requested_at = NULL');
      expect(status).toEqual({
        requested: false,
        requestedAt: null,
        scheduledAt: null,
        daysLeft: null,
      });
    });

    it('calcula los días que quedan, sin bajar de cero', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          deletion_requested_at: new Date(),
          deletion_scheduled_at: new Date(Date.now() - 86_400_000),
        },
      ]);
      expect((await service.getStatus('user-1')).daysLeft).toBe(0);
    });
  });

  describe('purgeDue', () => {
    it('borra las cuentas vencidas y nunca toca al usuario «Persona eliminada»', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await service.purgeDue(new Date('2027-02-01'));

      expect(mockDataSource.query.mock.calls[0][1]).toEqual([
        new Date('2027-02-01'),
        DELETED_USER_ID,
      ]);
    });

    it('un fallo no frena a las demás cuentas', async () => {
      const purge = jest.spyOn(service, 'purgeUser');
      purge.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
      mockDataSource.query.mockResolvedValueOnce([{ id: 'u-1' }, { id: 'u-2' }]);

      const result = await service.purgeDue();

      expect(result).toEqual({ purged: 1, failed: 1 });
      expect(purge).toHaveBeenCalledTimes(2);
    });
  });

  describe('purgeUser', () => {
    const account = { email: 'persona@example.com', provider: 'LOCAL' };
    const statements = () => mockManager.query.mock.calls.map(sqlOf);

    beforeEach(() => {
      mockDataSource.query.mockResolvedValueOnce([account]);
    });

    it('no hace nada con el usuario «Persona eliminada» ni con una cuenta que no existe', async () => {
      await service.purgeUser(DELETED_USER_ID);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();

      mockDataSource.query.mockReset().mockResolvedValueOnce([]);
      await service.purgeUser('no-existe');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('todo ocurre en una transacción y la fila de users se borra al final', async () => {
      await service.purgeUser('user-1');

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      const all = statements();
      expect(all[all.length - 1]).toBe('DELETE FROM users WHERE id = $1');
    });

    it('borra movimientos y ahorros planificados ANTES que la cuenta (llaves sin cascada)', async () => {
      await service.purgeUser('user-1');

      const all = statements();
      const tx = all.findIndex((s) => s.startsWith('DELETE FROM transactions'));
      const savings = all.findIndex((s) => s.startsWith('DELETE FROM planned_savings'));
      const users = all.findIndex((s) => s === 'DELETE FROM users WHERE id = $1');
      expect(tx).toBeGreaterThan(-1);
      expect(savings).toBeGreaterThan(tx);
      expect(users).toBeGreaterThan(savings);
    });

    it('reasigna lo compartido a «Persona eliminada» en lugar de dejar huérfanos', async () => {
      await service.purgeUser('user-1');

      const reassigned = mockManager.query.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1][0] === DELETED_USER_ID,
      );
      const text = reassigned.map(sqlOf).join(' | ');
      expect(text).toContain('UPDATE group_expenses');
      expect(text).toContain('UPDATE group_contributions');
      expect(text).toContain('UPDATE travel_expenses');
      expect(text).toContain('UPDATE travel_expense_assignments');
      expect(statements()).toEqual(
        expect.arrayContaining(['DELETE FROM group_members WHERE user_id = $1']),
      );
    });

    it('borra las tablas que guardan el identificador sin llave foránea', async () => {
      await service.purgeUser('user-1');

      for (const table of [
        'financial_health_scores',
        'goal_history',
        'refresh_tokens',
        'user_settings',
      ]) {
        expect(statements()).toContain(`DELETE FROM ${table} WHERE user_id = $1`);
      }
      expect(statements()).toContain('UPDATE budgets SET partner_id = NULL WHERE partner_id = $1');
    });

    it('traspasa la organización de un grupo si queda otra persona activa', async () => {
      mockManager.query.mockImplementation(async (sql: string) => {
        if (String(sql).includes('FROM user_groups WHERE owner_id')) return [{ id: 'g-1' }];
        if (String(sql).includes('ORDER BY (role')) return [{ user_id: 'user-2' }];
        return [];
      });

      await service.purgeUser('user-1');

      const transfer = mockManager.query.mock.calls.find((call) =>
        sqlOf(call).startsWith('UPDATE user_groups SET owner_id = $1 WHERE id = $2'),
      );
      expect(transfer?.[1]).toEqual(['user-2', 'g-1']);
      expect(statements().some((s) => s.startsWith('DELETE FROM user_groups WHERE id'))).toBe(
        false,
      );
    });

    it('si no queda nadie más, borra el grupo con todo lo que cuelga de él', async () => {
      mockManager.query.mockImplementation(async (sql: string) => {
        if (String(sql).includes('FROM user_groups WHERE owner_id')) return [{ id: 'g-9' }];
        return [];
      });

      await service.purgeUser('user-1');

      const all = statements();
      expect(all.some((s) => s.startsWith('DELETE FROM travel_expense_assignments'))).toBe(true);
      for (const table of [
        'travel_expenses',
        'group_expenses',
        'group_contributions',
        'group_members',
      ]) {
        expect(all).toContain(`DELETE FROM ${table} WHERE group_id = $1`);
      }
      expect(all).toContain('DELETE FROM user_groups WHERE id = $1');
    });

    it('si falla un paso la transacción se deshace y el error se propaga', async () => {
      mockManager.query.mockRejectedValueOnce(new Error('FK violada'));
      await expect(service.purgeUser('user-1')).rejects.toThrow('FK violada');
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('con acceso por Google borra también el registro de Firebase, después de confirmar', async () => {
      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce([{ email: 'g@example.com', provider: 'GOOGLE' }]);
      mockGetUserByEmail.mockResolvedValueOnce({ uid: 'uid-1' });

      await service.purgeUser('user-1');

      expect(mockGetUserByEmail).toHaveBeenCalledWith('g@example.com');
      expect(mockDeleteUser).toHaveBeenCalledWith('uid-1');
    });

    it('si Firebase falla no bloquea ni escribe el correo en el log', async () => {
      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce([{ email: 'g@example.com', provider: 'GOOGLE' }]);
      mockGetUserByEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });

      await expect(service.purgeUser('user-1')).resolves.toBeUndefined();

      const logged = JSON.stringify(mockLogger.warn.mock.calls);
      expect(logged).toContain('auth/user-not-found');
      expect(logged).not.toContain('g@example.com');
    });

    it('con acceso local no consulta Firebase', async () => {
      await service.purgeUser('user-1');
      expect(mockGetUserByEmail).not.toHaveBeenCalled();
    });
  });
});
