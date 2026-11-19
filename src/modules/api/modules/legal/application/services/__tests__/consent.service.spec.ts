import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { ConsentRequiredException } from '../../../domain/consent-required.exception';
import { ConsentService } from '../consent.service';

const mockRepo = { save: jest.fn(), findLatest: jest.fn() };
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const consent = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  userId: 'user-1',
  consentType: 'privacy_policy',
  version: '2.0',
  acceptedAt: new Date('2026-11-18T12:00:00Z'),
  ip: '203.0.113.9',
  userAgent: 'Mozilla/5.0',
  revokedAt: null,
  ...over,
});

describe('ConsentService', () => {
  let service: ConsentService;
  const original = { ...process.env };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        { provide: 'UserConsentRepository', useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();
    service = module.get(ConsentService);
    jest.clearAllMocks();
    delete process.env.LEGAL_CONSENT_REQUIRED;
    delete process.env.LEGAL_POLICY_VERSION;
    mockRepo.findLatest.mockResolvedValue(null);
    mockRepo.save.mockImplementation(async (data: Record<string, unknown>) => consent(data));
  });

  afterAll(() => {
    process.env = original;
  });

  describe('assertAcceptedForRegistration', () => {
    it('no exige nada mientras LEGAL_CONSENT_REQUIRED esté apagado (por defecto)', () => {
      expect(() => service.assertAcceptedForRegistration(undefined)).not.toThrow();
      expect(() => service.assertAcceptedForRegistration('0.1')).not.toThrow();
    });

    it('con la aceptación obligatoria rechaza si falta la versión', () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      expect(() => service.assertAcceptedForRegistration(undefined)).toThrow(
        ConsentRequiredException,
      );
      expect(() => service.assertAcceptedForRegistration('')).toThrow(ConsentRequiredException);
    });

    it('con la aceptación obligatoria rechaza una versión que no es la vigente', () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      expect(() => service.assertAcceptedForRegistration('1.0')).toThrow(/versión 2\.0/);
    });

    it('con la aceptación obligatoria acepta la versión vigente', () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      expect(() => service.assertAcceptedForRegistration('2.0')).not.toThrow();
      process.env.LEGAL_POLICY_VERSION = '2.1';
      expect(() => service.assertAcceptedForRegistration('2.1 ')).not.toThrow();
      expect(() => service.assertAcceptedForRegistration('2.0')).toThrow(ConsentRequiredException);
    });

    it('el error lleva un nombre estable para que el frontend lo reconozca', () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      try {
        service.assertAcceptedForRegistration(undefined);
      } catch (error) {
        expect((error as Error).constructor.name.replace('Exception', '')).toBe('ConsentRequired');
        expect((error as ConsentRequiredException).getStatus()).toBe(400);
      }
    });
  });

  describe('recordAcceptance', () => {
    it('graba usuario, versión, IP y dispositivo', async () => {
      await service.recordAcceptance('user-1', '2.0', { ip: '203.0.113.9', userAgent: 'UA' });

      expect(mockRepo.save).toHaveBeenCalledWith({
        userId: 'user-1',
        consentType: 'privacy_policy',
        version: '2.0',
        ip: '203.0.113.9',
        userAgent: 'UA',
      });
    });

    it('no graba nada si la versión no es la vigente o no llega', async () => {
      expect(await service.recordAcceptance('user-1', '1.0')).toBeNull();
      expect(await service.recordAcceptance('user-1', undefined)).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('es idempotente: no duplica si ya aceptó esa versión', async () => {
      mockRepo.findLatest.mockResolvedValue(consent());

      const result = await service.recordAcceptance('user-1', '2.0');

      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(result?.version).toBe('2.0');
    });

    it('recorta IP y dispositivo a lo que cabe en la columna', async () => {
      await service.recordAcceptance('user-1', '2.0', {
        ip: 'x'.repeat(200),
        userAgent: 'y'.repeat(500),
      });

      const saved = mockRepo.save.mock.calls[0][0];
      expect(saved.ip).toHaveLength(64);
      expect(saved.userAgent).toHaveLength(255);
    });
  });

  describe('accept', () => {
    it('rechaza una versión desactualizada', async () => {
      await expect(service.accept('user-1', '1.0')).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('graba y devuelve el estado actualizado', async () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      mockRepo.findLatest.mockResolvedValueOnce(null).mockResolvedValue(consent());

      const status = await service.accept('user-1', '2.0', { ip: '203.0.113.9' });

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(status).toMatchObject({
        accepted: true,
        acceptedVersion: '2.0',
        needsAcceptance: false,
      });
    });
  });

  describe('getStatus', () => {
    it('no pide aceptar mientras la aceptación no sea obligatoria', async () => {
      const status = await service.getStatus('user-1');
      expect(status).toMatchObject({
        accepted: false,
        consentRequired: false,
        needsAcceptance: false,
      });
    });

    it('pide aceptar si es obligatoria y la persona nunca aceptó', async () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      const status = await service.getStatus('user-1');
      expect(status).toMatchObject({
        accepted: false,
        acceptedVersion: null,
        needsAcceptance: true,
      });
    });

    it('pide aceptar de nuevo cuando cambia la versión de la política', async () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      process.env.LEGAL_POLICY_VERSION = '2.1';
      mockRepo.findLatest.mockResolvedValue(consent({ version: '2.0' }));

      const status = await service.getStatus('user-1');

      expect(status).toMatchObject({
        accepted: true,
        acceptedVersion: '2.0',
        needsAcceptance: true,
      });
    });

    it('no pide nada si ya aceptó la versión vigente', async () => {
      process.env.LEGAL_CONSENT_REQUIRED = 'true';
      mockRepo.findLatest.mockResolvedValue(consent());
      const status = await service.getStatus('user-1');
      expect(status.needsAcceptance).toBe(false);
    });
  });
});
