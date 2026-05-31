import { Body, Controller, Get, Ip, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.request';
import { AdminGuard } from '@/common/guards/admin.guard';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AdminAnnouncementsService } from '../../application/admin-announcements.service';
import {
  AnnouncementItemDto,
  AnnouncementPreviewQueryDto,
  AnnouncementResponseDto,
  AnnouncementSegment,
  CreateAnnouncementDto,
} from '../dto/announcement.dto';

@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  private readonly context = AdminAnnouncementsController.name;

  constructor(
    private readonly announcementsService: AdminAnnouncementsService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Get('preview')
  @ApiOperation({ summary: 'Vista previa del número de destinatarios por segmento' })
  @ApiQuery({ name: 'segment', enum: AnnouncementSegment })
  @ApiOkResponse({
    description: 'Número aproximado de destinatarios',
    schema: { properties: { count: { type: 'number' } } },
  })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async preview(@Query() query: AnnouncementPreviewQueryDto) {
    this.logger.info(this.context, `Preview count for segment=${query.segment}`);
    const count = await this.announcementsService.previewCount(query.segment);
    return { count };
  }

  @Post()
  @ApiOperation({ summary: 'Enviar anuncio a un segmento de usuarios' })
  @ApiOkResponse({ description: 'Anuncio enviado', type: AnnouncementResponseDto })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async send(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    this.logger.info(this.context, `Sending announcement segment=${dto.segment}`);
    return this.announcementsService.send(dto, user.userId, user.email, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de anuncios enviados' })
  @ApiOkResponse({ description: 'Lista de anuncios', type: [AnnouncementItemDto] })
  @ApiForbiddenResponse({ description: 'Requiere rol ADMIN o SUPER_ADMIN' })
  async list() {
    this.logger.info(this.context, 'Fetching announcements history');
    return this.announcementsService.list();
  }
}
