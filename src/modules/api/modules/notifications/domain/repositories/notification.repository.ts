import { NotificationType } from '../enums/notification-type.enum';
import { Notification, NotificationPayload } from '../notification';

export interface NotificationRepository {
  save(userId: string, type: NotificationType, payload: NotificationPayload): Promise<Notification>;
  findByUserId(userId: string): Promise<Notification[]>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}
