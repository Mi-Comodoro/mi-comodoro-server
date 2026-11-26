import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.request';
import { AdminGuard } from '@/common/guards/admin.guard';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

import { AuditLogService } from '../../../admin/application/audit-log.service';
import { BetaAccessService } from '../../application/services/beta-access.service';
import { ListBetaRequestsQueryDto } from '../dto/beta-access.dto';

/** Aprobación de solicitudes de acceso a la beta: solo ADMIN o SUPER_ADMIN, con rastro de auditoría. */
@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/beta-access')
export class AdminBetaAccessController {
  constructor(
    private readonly service: BetaAccessService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes de acceso a la beta' })
  @ApiOkResponse({ description: 'Solicitudes (nunca incluye el token de invitación)' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async list(@Query() query: ListBetaRequestsQueryDto) {
    return await this.service.list(query.status);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Conteo por estado y cupo de la beta' })
  @ApiOkResponse({ description: '{ pending, approved, registered, rejected, maxUsers, used }' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async summary() {
    return await this.service.summary();
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Aprobar (o volver a emitir la invitación). El token solo se devuelve en esta respuesta',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: '{ id, email, inviteToken, inviteExpiresAt }' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    const result = await this.service.approve(id, user.userId);
    // El correo de quien pide acceso no va al registro de auditoría: basta con el id de la solicitud
    await this.auditLogService.log({
      adminId: user.userId,
      adminHandle: user.email,
      action: 'BETA_ACCESS_APPROVED',
      targetId: id,
      targetType: 'beta_request',
      after: { expiresAt: result.inviteExpiresAt.toISOString() },
      ip,
    });
    return result;
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar una solicitud (se borra a los 30 días)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: '{ rejected: true }' })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    await this.service.reject(id, user.userId);
    await this.auditLogService.log({
      adminId: user.userId,
      adminHandle: user.email,
      action: 'BETA_ACCESS_REJECTED',
      targetId: id,
      targetType: 'beta_request',
      ip,
    });
    return { rejected: true };
  }
}
