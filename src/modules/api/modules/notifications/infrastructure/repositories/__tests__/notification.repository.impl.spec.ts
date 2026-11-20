import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { NotificationRepositoryImpl } from '../notification.repository.impl';

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
};

const makeNotificationEntity = (overrides = {}) => ({
  id: 'notif-1',
  userId: 'user-1',
  type: NotificationType.ANNOUNCEMENT,
  payload: { title: 'Test', body: 'Mensaje de prueba' },
  isRead: false,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('NotificationRepositoryImpl', () => {
  let repository: NotificationRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRepositoryImpl,
        { provide: getRepositoryToken(NotificationEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<NotificationRepositoryImpl>(NotificationRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('creates and saves notification, returns domain object', async () => {
      const entity = makeNotificationEntity();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const result = await repository.save('user-1', NotificationType.ANNOUNCEMENT, {
        title: 'Test',
        body: 'Mensaje de prueba',
      });

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.ANNOUNCEMENT,
        payload: { title: 'Test', body: 'Mensaje de prueba' },
      });
      expect(result).toMatchObject({ id: 'notif-1', isRead: false });
    });
  });

  describe('findByUserId', () => {
    it('returns paginated notifications with total', async () => {
      const entity = makeNotificationEntity();
      mockRepo.findAndCount.mockResolvedValue([[entity], 1]);

      const result = await repository.findByUserId('user-1', 0, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, skip: 0, take: 10 }),
      );
    });

    it('returns empty list when no notifications', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await repository.findByUserId('user-1');
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('updates isRead to true for given notification', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.markAsRead('notif-1', 'user-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'notif-1', userId: 'user-1' },
        { isRead: true },
      );
    });
  });

  describe('saveBulk', () => {
    it('inserts notifications for all userIds', async () => {
      mockRepo.insert.mockResolvedValue(undefined);
      await repository.saveBulk(['user-1', 'user-2'], NotificationType.ANNOUNCEMENT, {
        title: 'Anuncio',
        body: 'Contenido',
      });
      expect(mockRepo.insert).toHaveBeenCalledWith([
        {
          userId: 'user-1',
          type: NotificationType.ANNOUNCEMENT,
          payload: { title: 'Anuncio', body: 'Contenido' },
        },
        {
          userId: 'user-2',
          type: NotificationType.ANNOUNCEMENT,
          payload: { title: 'Anuncio', body: 'Contenido' },
        },
      ]);
    });

    it('skips insert when userIds is empty', async () => {
      await repository.saveBulk([], NotificationType.ANNOUNCEMENT, { title: 'x', body: 'y' });
      expect(mockRepo.insert).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications for user as read', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.markAllAsRead('user-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        { isRead: true },
      );
    });
  });

  describe('deleteOne', () => {
    it('deletes single notification for user', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      await repository.deleteOne('notif-1', 'user-1');
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 'notif-1', userId: 'user-1' });
    });
  });

  describe('deleteAll', () => {
    it('deletes all notifications for user', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      await repository.deleteAll('user-1');
      expect(mockRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    });
  });
});
