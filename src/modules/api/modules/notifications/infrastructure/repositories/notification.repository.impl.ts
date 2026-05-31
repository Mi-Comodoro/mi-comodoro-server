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

  async findByUserId(
    userId: string,
    skip = 0,
    take = 50,
  ): Promise<{ items: Notification[]; total: number }> {
    const [entities, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { items: entities.map((e) => this.toDomain(e)), total };
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

  async deleteOne(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }

  async deleteAll(userId: string): Promise<void> {
    await this.repo.delete({ userId });
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
