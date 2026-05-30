import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { NotificationType } from '../../domain/enums/notification-type.enum';
import { Notification, NotificationPayload } from '../../domain/notification';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@Injectable()
export class NotificationsService {
  private readonly context = NotificationsService.name;

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: LoggerProviderService,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<Notification> {
    this.logger.info(this.context, `Creating notification type=${type} for user=${userId}`);
    return this.notificationRepository.save(userId, type, payload);
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
