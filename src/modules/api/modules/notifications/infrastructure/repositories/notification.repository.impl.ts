import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationType } from '../../domain/enums/notification-type.enum';
import { Notification, NotificationPayload } from '../../domain/notification';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationEntity } from '../database/entities/notification.entity';

@Injectable()
export class NotificationRepositoryImpl implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {}

  async save(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<Notification> {
    const entity = this.repo.create({ userId, type, payload });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.repo.update({ id: notificationId, userId }, { isRead: true });
  }

  async saveBulk(
    userIds: string[],
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<void> {
    if (!userIds.length) return;
    const rows = userIds.map((userId) => ({ userId, type, payload }));
    await this.repo.insert(rows);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }

  private toDomain(entity: NotificationEntity): Notification {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      payload: entity.payload,
      isRead: entity.isRead,
      createdAt: entity.createdAt,
    };
  }
}
