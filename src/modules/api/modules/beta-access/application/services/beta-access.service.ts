import { createHash, randomBytes } from 'node:crypto';

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { SystemConfigService } from '@/core/modules/system-config/system-config.service';
import { LoggerProviderService } from '@/core/providers';

import {
  CONFIG_INVITE_DAYS,
  CONFIG_MAX_USERS,
  DEFAULT_INVITE_DAYS,
  DEFAULT_MAX_USERS,
  getBetaAccessConfig,
  RETENTION_DAYS,
} from '../../beta-access.config';
import type {
  BetaAccessRequest,
  BetaAccessRequestView,
  BetaAccessStatus,
} from '../../domain/beta-access-request';
import { BetaInviteRequiredException } from '../../domain/beta-invite-required.exception';
import type { BetaAccessRepository } from '../../domain/repositories/beta-access.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

export const hashInviteToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const toView = (request: BetaAccessRequest): BetaAccessRequestView => {
  const view: Partial<BetaAccessRequest> = { ...request };
  delete view.inviteTokenHash;
  return view as BetaAccessRequestView;
};

@Injectable()
export class BetaAccessService {
  private readonly context = BetaAccessService.name;

  constructor(
    @Inject('BetaAccessRepository')
    private readonly repository: BetaAccessRepository,
    private readonly systemConfig: SystemConfigService,
    private readonly logger: LoggerProviderService,
  ) {}

  // ── Solicitud pública ────────────────────────────────────────────────────

  /**
   * Registra la solicitud. La respuesta no revela si el correo ya había pedido acceso: una solicitud
   * repetida se ignora en silencio. La evidencia es la versión de la política y la fecha que pone la base.
   */
  async request(email: string, policyVersion: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const existing = await this.repository.findByEmail(normalized);
    if (existing) return;
    const created = await this.repository.create({ email: normalized, policyVersion });
    this.logger.info(this.context, `Solicitud de acceso a la beta ${created.id} recibida`);
  }

  // ── Administración ───────────────────────────────────────────────────────

  async list(status?: BetaAccessStatus): Promise<BetaAccessRequestView[]> {
    return (await this.repository.list(status)).map(toView);
  }

  async summary() {
    const [pending, approved, registered, rejected] = await Promise.all(
      (['pending', 'approved', 'registered', 'rejected'] as const).map((s) =>
        this.repository.countByStatus([s]),
      ),
    );
    const maxUsers = await this.systemConfig.getNumber(CONFIG_MAX_USERS, DEFAULT_MAX_USERS);
    return { pending, approved, registered, rejected, maxUsers, used: approved + registered };
  }

  /**
   * Aprueba una solicitud pendiente (consume un cupo) o vuelve a emitir la invitación de una ya aprobada
   * (no consume cupo). El token solo se devuelve aquí: en la base queda su hash.
   */
  async approve(id: string, adminId: string) {
    const request = await this.getRequired(id);
    if (request.status === 'registered') {
      throw new ConflictException('La persona ya se registró con esta invitación.');
    }
    if (request.status === 'rejected') {
      throw new ConflictException(
        'La solicitud fue rechazada. La persona debe pedir acceso de nuevo.',
      );
    }
    if (request.status === 'pending') {
      const used = await this.repository.countByStatus(['approved', 'registered']);
      const maxUsers = await this.systemConfig.getNumber(CONFIG_MAX_USERS, DEFAULT_MAX_USERS);
      if (used >= maxUsers) {
        throw new ConflictException(
          `Se alcanzó el cupo de la beta (${maxUsers}). Súbelo en Admin > Configuración (${CONFIG_MAX_USERS}).`,
        );
      }
    }

    const days = await this.systemConfig.getNumber(CONFIG_INVITE_DAYS, DEFAULT_INVITE_DAYS);
    const inviteToken = randomBytes(32).toString('base64url');
    const inviteExpiresAt = new Date(Date.now() + days * DAY_MS);
    await this.repository.update(id, {
      status: 'approved',
      decidedBy: adminId,
      decidedAt: new Date(),
      inviteTokenHash: hashInviteToken(inviteToken),
      inviteExpiresAt,
    });
    this.logger.info(this.context, `Solicitud ${id} aprobada por ${adminId}`);
    return { id, email: request.email, inviteToken, inviteExpiresAt };
  }

  async reject(id: string, adminId: string): Promise<void> {
    const request = await this.getRequired(id);
    if (request.status === 'registered') {
      throw new ConflictException('La persona ya se registró: no se puede rechazar.');
    }
    await this.repository.update(id, {
      status: 'rejected',
      decidedBy: adminId,
      decidedAt: new Date(),
      inviteTokenHash: null,
      inviteExpiresAt: null,
    });
    this.logger.info(this.context, `Solicitud ${id} rechazada por ${adminId}`);
  }

  // ── Invitaciones ─────────────────────────────────────────────────────────

  /** Para precargar el correo en el registro. Un token inválido o vencido responde siempre igual. */
  async validateInvitation(token: string): Promise<{ email: string }> {
    const request = await this.findUsable(token);
    if (!request?.email) throw new NotFoundException('La invitación no es válida o ya venció.');
    return { email: request.email };
  }

  /**
   * Se llama ANTES de crear la cuenta. Con BETA_INVITE_REQUIRED apagado no exige nada; encendido exige
   * una invitación aprobada, vigente y emitida para ese mismo correo.
   */
  async assertCanRegister(email: string, inviteToken?: string | null): Promise<void> {
    if (!getBetaAccessConfig().inviteRequired) return;
    const request = inviteToken ? await this.findUsable(inviteToken) : null;
    if (!request || request.email !== normalizeEmail(email)) {
      throw new BetaInviteRequiredException();
    }
  }

  /**
   * Se llama DESPUÉS de crear la cuenta: gasta la invitación y borra el correo de la solicitud (la cuenta
   * ya lo guarda). Si no hay invitación válida no hace nada.
   */
  async markRegistered(email: string, inviteToken: string | null | undefined, userId: string) {
    if (!inviteToken) return;
    const request = await this.findUsable(inviteToken);
    if (!request || request.email !== normalizeEmail(email)) return;
    await this.repository.update(request.id, {
      status: 'registered',
      email: null,
      inviteTokenHash: null,
      inviteExpiresAt: null,
      registeredUserId: userId,
      registeredAt: new Date(),
    });
    this.logger.info(this.context, `Solicitud ${request.id} usada por ${userId}`);
  }

  // ── Retención ────────────────────────────────────────────────────────────

  async purgeExpired(now: Date = new Date()) {
    const before = (days: number) => new Date(now.getTime() - days * DAY_MS);
    const rejected = await this.repository.deleteRejectedBefore(before(RETENTION_DAYS.rejected));
    const pending = await this.repository.deletePendingBefore(before(RETENTION_DAYS.pending));
    const expired = await this.repository.deleteApprovedExpiredBefore(
      before(RETENTION_DAYS.expiredInvite),
    );
    if (rejected + pending + expired > 0) {
      this.logger.info(
        this.context,
        `Solicitudes de acceso borradas por retención: ${rejected} rechazadas, ${pending} pendientes, ${expired} invitaciones vencidas`,
      );
    }
    return { rejected, pending, expired };
  }

  // ── Internos ─────────────────────────────────────────────────────────────

  private async getRequired(id: string): Promise<BetaAccessRequest> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return request;
  }

  /** Solicitud aprobada cuya invitación existe y no ha vencido. */
  private async findUsable(token: string): Promise<BetaAccessRequest | null> {
    if (!token || token.length > 200) return null;
    const request = await this.repository.findByTokenHash(hashInviteToken(token));
    if (!request || request.status !== 'approved') return null;
    if (!request.inviteExpiresAt || request.inviteExpiresAt.getTime() < Date.now()) return null;
    return request;
  }
}
