import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { ConsentRequiredException } from '../../domain/consent-required.exception';
import type { UserConsentRepository } from '../../domain/repositories/user-consent.repository';
import { ConsentContext, ConsentStatus } from '../../domain/user-consent';
import { CONSENT_TYPE_POLICY, getLegalConfig } from '../../legal.config';

const clip = (value: string | null | undefined, max: number): string | null =>
  value ? value.slice(0, max) : null;

@Injectable()
export class ConsentService {
  private readonly context = ConsentService.name;

  constructor(
    @Inject('UserConsentRepository')
    private readonly consentRepository: UserConsentRepository,
    private readonly logger: LoggerProviderService,
  ) {}

  getVersions() {
    return getLegalConfig();
  }

  /**
   * Se llama ANTES de crear una cuenta: si la aceptación es obligatoria, la versión enviada debe ser
   * la vigente. Con LEGAL_CONSENT_REQUIRED apagado no exige nada.
   */
  assertAcceptedForRegistration(acceptedVersion?: string | null): void {
    const { consentRequired, policyVersion } = getLegalConfig();
    if (!consentRequired) return;
    if (acceptedVersion?.trim() !== policyVersion) {
      throw new ConsentRequiredException(policyVersion);
    }
  }

  /**
   * Graba la evidencia de que la persona aceptó la versión vigente. Si la versión enviada no es la
   * vigente no se graba nada (no hay evidencia válida de una versión que no está publicada).
   */
  async recordAcceptance(
    userId: string,
    acceptedVersion: string | null | undefined,
    context: ConsentContext = {},
  ) {
    const { policyVersion } = getLegalConfig();
    if (acceptedVersion?.trim() !== policyVersion) return null;

    const current = await this.consentRepository.findLatest(userId, CONSENT_TYPE_POLICY);
    if (current?.version === policyVersion) return current;

    const saved = await this.consentRepository.save({
      userId,
      consentType: CONSENT_TYPE_POLICY,
      version: policyVersion,
      ip: clip(context.ip, 64),
      userAgent: clip(context.userAgent, 255),
    });
    this.logger.info(this.context, `Consentimiento v${policyVersion} registrado para ${userId}`);
    return saved;
  }

  /** Aceptación explícita desde la aplicación (usuarios existentes que deben aceptar la nueva versión) */
  async accept(userId: string, version: string, context: ConsentContext = {}) {
    const { policyVersion } = getLegalConfig();
    if (version.trim() !== policyVersion) {
      throw new BadRequestException(
        `La versión ${version} de la política ya no está vigente. Recarga la página y vuelve a intentarlo.`,
      );
    }
    await this.recordAcceptance(userId, version, context);
    return await this.getStatus(userId);
  }

  async getStatus(userId: string): Promise<ConsentStatus> {
    const { policyVersion, consentRequired } = getLegalConfig();
    const latest = await this.consentRepository.findLatest(userId, CONSENT_TYPE_POLICY);
    const upToDate = latest?.version === policyVersion;
    return {
      policyVersion,
      consentRequired,
      accepted: Boolean(latest),
      acceptedVersion: latest?.version ?? null,
      acceptedAt: latest?.acceptedAt ?? null,
      needsAcceptance: consentRequired && !upToDate,
    };
  }
}
