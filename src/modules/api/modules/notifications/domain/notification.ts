import { NotificationType } from './enums/notification-type.enum';

export interface NotificationPayload {
  senderHandle?: string;
  senderDisplayName?: string;
  senderId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  isRead: boolean;
  createdAt: Date;
}
