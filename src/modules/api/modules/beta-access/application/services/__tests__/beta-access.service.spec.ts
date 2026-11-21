import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SystemConfigService } from '@/core/modules/system-config/system-config.service';
import { LoggerProviderService } from '@/core/providers';

import type { BetaAccessRequest } from '../../../domain/beta-access-request';
import { BetaInviteRequiredException } from '../../../domain/beta-invite-required.exception';
import { BetaAccessService, hashInviteToken } from '../beta-access.service';

const DAY = 24 * 60 * 60 * 1000;

const makeRequest = (overrides: Partial<BetaAccessRequest> = {}): BetaAccessRequest => ({
  id: 'req-1',
  email: 'persona@ejemplo.com',
  status: 'pending',
  policyVersion: '2.0',
  consentAt: new Date(),
  decidedBy: null,
  decidedAt: null,
  inviteTokenHash: null,
  inviteExpiresAt: null,
  registeredUserId: null,
  registeredAt: null,
  createdAt: new Date(),
  ...overrides,
});

const repo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByTokenHash: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  countByStatus: jest.fn(),
  deleteRejectedBefore: jest.fn().mockResolvedValue(0),
  deletePendingBefore: jest.fn().mockResolvedValue(0),
  deleteApprovedExpiredBefore: jest.fn().mockResolvedValue(0),
};
const systemConfig = { getNumber: jest.fn() };
const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

describe('BetaAccessService', () => {
  let service: BetaAccessService;
  const previousFlag = process.env.BETA_INVITE_REQUIRED;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.BETA_INVITE_REQUIRED;
    systemConfig.getNumber.mockImplementation((_key: string, fallback: number) =>
      Promise.resolve(fallback),
    );
    const module = await Test.createTestingModule({
      providers: [
        BetaAccessService,
        { provide: 'BetaAccessRepository', useValue: repo },
        { provide: SystemConfigService, useValue: systemConfig },
        { provide: LoggerProviderService, useValue: logger },
      ],
    }).compile();
    service = module.get(BetaAccessService);
  });

  afterAll(() => {
    if (previousFlag === undefined) delete process.env.BETA_INVITE_REQUIRED;
    else process.env.BETA_INVITE_REQUIRED = previousFlag;
  });

  describe('request', () => {
    it('guarda la solicitud con el correo normalizado y la versión de la política', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeRequest());

      await service.request('  Persona@Ejemplo.COM ', '2.0');

      expect(repo.create).toHaveBeenCalledWith({
        email: 'persona@ejemplo.com',
        policyVersion: '2.0',
      });
    });

    it('ignora en silencio una solicitud repetida (no revela si el correo ya pidió)', async () => {
      repo.findByEmail.mockResolvedValue(makeRequest());

      await expect(service.request('persona@ejemplo.com', '2.0')).resolves.toBeUndefined();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('no escribe el correo en los logs', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeRequest());

      await service.request('persona@ejemplo.com', '2.0');

      expect(JSON.stringify(logger.info.mock.calls)).not.toContain('persona@ejemplo.com');
    });
  });

  describe('approve', () => {
    it('aprueba una pendiente, devuelve el token una vez y guarda solo su hash', async () => {
      repo.findById.mockResolvedValue(makeRequest());
      repo.countByStatus.mockResolvedValue(3);

      const result = await service.approve('req-1', 'admin-1');

      expect(result.inviteToken.length).toBeGreaterThanOrEqual(40);
      const patch = repo.update.mock.calls[0][1];
      expect(patch.status).toBe('approved');
      expect(patch.decidedBy).toBe('admin-1');
      expect(patch.inviteTokenHash).toBe(hashInviteToken(result.inviteToken));
      expect(JSON.stringify(patch)).not.toContain(result.inviteToken);
      // 14 días por defecto
      expect(result.inviteExpiresAt.getTime()).toBeGreaterThan(Date.now() + 13 * DAY);
      expect(result.inviteExpiresAt.getTime()).toBeLessThan(Date.now() + 15 * DAY);
    });

    it('no aprueba más allá del cupo configurado', async () => {
      repo.findById.mockResolvedValue(makeRequest());
      repo.countByStatus.mockResolvedValue(10);

      await expect(service.approve('req-1', 'admin-1')).rejects.toThrow(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('usa el cupo de la configuración del sistema', async () => {
      systemConfig.getNumber.mockImplementation((key: string, fallback: number) =>
        Promise.resolve(key === 'beta_max_users' ? 25 : fallback),
      );
      repo.findById.mockResolvedValue(makeRequest());
      repo.countByStatus.mockResolvedValue(10);

      await expect(service.approve('req-1', 'admin-1')).resolves.toBeDefined();
    });

    it('volver a emitir una invitación ya aprobada no consume cupo', async () => {
      repo.findById.mockResolvedValue(makeRequest({ status: 'approved' }));
      repo.countByStatus.mockResolvedValue(10);

      await expect(service.approve('req-1', 'admin-1')).resolves.toBeDefined();
      expect(repo.countByStatus).not.toHaveBeenCalled();
    });

    it('no reabre una solicitud rechazada ni una ya registrada', async () => {
      repo.findById.mockResolvedValue(makeRequest({ status: 'rejected' }));
      await expect(service.approve('req-1', 'admin-1')).rejects.toThrow(ConflictException);
      repo.findById.mockResolvedValue(makeRequest({ status: 'registered' }));
      await expect(service.approve('req-1', 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('responde 404 si la solicitud no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.approve('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('rechaza y revoca la invitación', async () => {
      repo.findById.mockResolvedValue(makeRequest({ status: 'approved' }));

      await service.reject('req-1', 'admin-1');

      expect(repo.update).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({
          status: 'rejected',
          inviteTokenHash: null,
          inviteExpiresAt: null,
        }),
      );
    });

    it('no rechaza a quien ya se registró', async () => {
      repo.findById.mockResolvedValue(makeRequest({ status: 'registered' }));
      await expect(service.reject('req-1', 'admin-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('invitaciones', () => {
    const approved = (overrides: Partial<BetaAccessRequest> = {}) =>
      makeRequest({
        status: 'approved',
        inviteTokenHash: hashInviteToken('tok'),
        inviteExpiresAt: new Date(Date.now() + DAY),
        ...overrides,
      });

    it('valida una invitación vigente y devuelve el correo', async () => {
      repo.findByTokenHash.mockResolvedValue(approved());
      await expect(service.validateInvitation('tok')).resolves.toEqual({
        email: 'persona@ejemplo.com',
      });
      expect(repo.findByTokenHash).toHaveBeenCalledWith(hashInviteToken('tok'));
    });

    it('una invitación vencida, desconocida o ya usada responde siempre igual (404)', async () => {
      repo.findByTokenHash.mockResolvedValue(
        approved({ inviteExpiresAt: new Date(Date.now() - 1) }),
      );
      await expect(service.validateInvitation('tok')).rejects.toThrow(NotFoundException);
      repo.findByTokenHash.mockResolvedValue(null);
      await expect(service.validateInvitation('tok')).rejects.toThrow(NotFoundException);
      repo.findByTokenHash.mockResolvedValue(approved({ status: 'registered' }));
      await expect(service.validateInvitation('tok')).rejects.toThrow(NotFoundException);
    });

    it('con el interruptor apagado el registro no exige invitación', async () => {
      await expect(
        service.assertCanRegister('otra@persona.com', undefined),
      ).resolves.toBeUndefined();
      expect(repo.findByTokenHash).not.toHaveBeenCalled();
    });

    describe('con BETA_INVITE_REQUIRED=true', () => {
      beforeEach(() => {
        process.env.BETA_INVITE_REQUIRED = 'true';
      });

      it('rechaza el registro sin invitación', async () => {
        await expect(service.assertCanRegister('persona@ejemplo.com', undefined)).rejects.toThrow(
          BetaInviteRequiredException,
        );
      });

      it('rechaza una invitación emitida para otro correo', async () => {
        repo.findByTokenHash.mockResolvedValue(approved());
        await expect(service.assertCanRegister('otra@persona.com', 'tok')).rejects.toThrow(
          BetaInviteRequiredException,
        );
      });

      it('rechaza una invitación vencida', async () => {
        repo.findByTokenHash.mockResolvedValue(
          approved({ inviteExpiresAt: new Date(Date.now() - 1) }),
        );
        await expect(service.assertCanRegister('persona@ejemplo.com', 'tok')).rejects.toThrow(
          BetaInviteRequiredException,
        );
      });

      it('acepta una invitación vigente para ese correo (sin importar mayúsculas)', async () => {
        repo.findByTokenHash.mockResolvedValue(approved());
        await expect(
          service.assertCanRegister(' Persona@Ejemplo.com', 'tok'),
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('markRegistered', () => {
    it('gasta la invitación, borra el correo y guarda el id de la cuenta', async () => {
      repo.findByTokenHash.mockResolvedValue(
        makeRequest({
          status: 'approved',
          inviteTokenHash: hashInviteToken('tok'),
          inviteExpiresAt: new Date(Date.now() + DAY),
        }),
      );

      await service.markRegistered('persona@ejemplo.com', 'tok', 'user-9');

      expect(repo.update).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({
          status: 'registered',
          email: null,
          inviteTokenHash: null,
          registeredUserId: 'user-9',
        }),
      );
    });

    it('no hace nada sin token o con un token que no coincide con el correo', async () => {
      await service.markRegistered('persona@ejemplo.com', undefined, 'user-9');
      repo.findByTokenHash.mockResolvedValue(
        makeRequest({
          status: 'approved',
          inviteTokenHash: hashInviteToken('tok'),
          inviteExpiresAt: new Date(Date.now() + DAY),
        }),
      );
      await service.markRegistered('otra@persona.com', 'tok', 'user-9');

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('purgeExpired', () => {
    it('aplica la retención: rechazadas 30 días, pendientes 12 meses, invitaciones vencidas 30 días', async () => {
      const now = new Date('2026-12-01T00:00:00Z');
      repo.deleteRejectedBefore.mockResolvedValue(2);

      const result = await service.purgeExpired(now);

      expect(repo.deleteRejectedBefore).toHaveBeenCalledWith(new Date(now.getTime() - 30 * DAY));
      expect(repo.deletePendingBefore).toHaveBeenCalledWith(new Date(now.getTime() - 365 * DAY));
      expect(repo.deleteApprovedExpiredBefore).toHaveBeenCalledWith(
        new Date(now.getTime() - 30 * DAY),
      );
      expect(result).toEqual({ rejected: 2, pending: 0, expired: 0 });
    });
  });

  describe('list', () => {
    it('nunca expone el hash de la invitación', async () => {
      repo.list.mockResolvedValue([
        makeRequest({ status: 'approved', inviteTokenHash: 'a'.repeat(64) }),
      ]);

      const [view] = await service.list();

      expect(view).not.toHaveProperty('inviteTokenHash');
    });
  });
});
