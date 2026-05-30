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
    this.logger.info(this.context, `Creating notification type=${type} for user=${userId}`);
    return this.notificationRepository.save(userId, type, payload);
  }

  async createBulk(userIds: string[], payload: NotificationPayload): Promise<void> {
    if (!userIds.length) return;
    this.logger.info(
      this.context,
      `Creating bulk announcement notifications for ${userIds.length} users`,
    );
    await this.notificationRepository.saveBulk(userIds, NotificationType.ANNOUNCEMENT, payload);
    for (const userId of userIds) {
      this.gateway.sendToUser(userId, 'notification', {
        type: NotificationType.ANNOUNCEMENT,
        payload,
      });
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    this.logger.info(this.context, `Fetching notifications for user=${userId}`);
    return this.notificationRepository.findByUserId(userId);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Marking notification ${notificationId} as read`);
    await this.notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.logger.info(this.context, `Marking all notifications as read for user=${userId}`);
    await this.notificationRepository.markAllAsRead(userId);
  }
}
