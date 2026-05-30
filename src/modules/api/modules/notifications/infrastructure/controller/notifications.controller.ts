import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

import { NotificationsService } from '../../application/services/notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener notificaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones' })
  async getNotifications(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUserNotifications(user.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiResponse({ status: 200 })
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllAsRead(user.userId);
    return { success: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiResponse({ status: 200 })
  async markAsRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.notificationsService.markAsRead(id, user.userId);
    return { success: true };
  }
}
