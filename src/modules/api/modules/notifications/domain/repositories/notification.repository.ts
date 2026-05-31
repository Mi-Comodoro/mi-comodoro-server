import { NotificationType } from '../enums/notification-type.enum';
import { Notification, NotificationPayload } from '../notification';

export interface NotificationRepository {
  save(userId: string, type: NotificationType, payload: NotificationPayload): Promise<Notification>;
  saveBulk(userIds: string[], type: NotificationType, payload: NotificationPayload): Promise<void>;
  findByUserId(
    userId: string,
    skip?: number,
    take?: number,
  ): Promise<{ items: Notification[]; total: number }>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteOne(id: string, userId: string): Promise<void>;
  deleteAll(userId: string): Promise<void>;
}
