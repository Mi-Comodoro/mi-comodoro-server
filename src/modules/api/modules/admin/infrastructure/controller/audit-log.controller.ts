import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SuperAdminGuard } from '@/common/guards/super-admin.guard';
import { LoggerProviderService } from '@/core/providers';

import { AuditLogService } from '../../application/audit-log.service';
import { AuditLogItemDto, AuditLogQueryDto } from '../dto/audit-log.dto';

@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('admin/audit-logs')
export class AuditLogController {
  private readonly context = AuditLogController.name;

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Historial de acciones admin con filtros y paginación' })
  @ApiOkResponse({ description: 'Registros de auditoría paginados', type: [AuditLogItemDto] })
  @ApiForbiddenResponse({ description: 'Solo SUPER_ADMIN puede ver el log de auditoría' })
  async findAll(@Query() query: AuditLogQueryDto) {
    this.logger.info(this.context, 'Fetching audit logs');
    return this.auditLogService.findAll(query);
  }
}
