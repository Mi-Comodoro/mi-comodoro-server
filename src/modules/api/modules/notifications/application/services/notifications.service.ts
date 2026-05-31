import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { NotificationType } from '../../domain/enums/notification-type.enum';
import { Notification, NotificationPayload } from '../../domain/notification';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationsGateway } from '../../infrastructure/gateway/notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly context = NotificationsService.name;

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: LoggerProviderService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<Notification> {
    this.logger.info(this.context, `Creando notificación type=${type} para user=${userId}`);
    return this.notificationRepository.save(userId, type, payload);
  }

  async createBulk(userIds: string[], payload: NotificationPayload): Promise<void> {
    if (!userIds.length) return;
    this.logger.info(
      this.context,
      `Creando notificaciones de anuncio en bulk para ${userIds.length} usuarios`,
    );
    await this.notificationRepository.saveBulk(userIds, NotificationType.ANNOUNCEMENT, payload);
    for (const userId of userIds) {
      this.gateway.sendToUser(userId, 'notification', {
        type: NotificationType.ANNOUNCEMENT,
        payload,
      });
    }
  }

  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: Notification[]; total: number }> {
    this.logger.info(
      this.context,
      `Obteniendo notificaciones user=${userId} page=${page} limit=${limit}`,
    );
    const skip = (page - 1) * limit;
    return this.notificationRepository.findByUserId(userId, skip, limit);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Marcando notificación ${notificationId} como leída`);
    await this.notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.logger.info(this.context, `Marcando todas las notificaciones como leídas user=${userId}`);
    await this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Eliminando notificación ${id} de user=${userId}`);
    await this.notificationRepository.deleteOne(id, userId);
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    this.logger.info(this.context, `Eliminando todas las notificaciones de user=${userId}`);
    await this.notificationRepository.deleteAll(userId);
  }
}
