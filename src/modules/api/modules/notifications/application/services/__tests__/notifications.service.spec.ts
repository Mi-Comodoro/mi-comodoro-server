import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { NotificationsGateway } from '../../../infrastructure/gateway/notifications.gateway';
import { NotificationsService } from '../notifications.service';

const mockRepo = {
  save: jest.fn(),
  saveBulk: jest.fn(),
  findByUserId: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteOne: jest.fn(),
  deleteAll: jest.fn(),
};

const mockGateway = { sendToUser: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeNotification = (overrides = {}) => ({
  id: 'notif-1',
  userId: 'user-1',
  type: NotificationType.FRIEND_REQUEST,
  payload: {},
  isRead: false,
  createdAt: new Date(),
  ...overrides,
});

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: 'NotificationRepository', useValue: mockRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  // ─── createNotification ────────────────────────────────────────────────────
  describe('createNotification', () => {
    it('saves notification and sends via gateway', async () => {
      const notif = makeNotification();
      mockRepo.save.mockResolvedValue(notif);

      const result = await service.createNotification(
        'user-1',
        NotificationType.FRIEND_REQUEST,
        {},
      );

      expect(mockRepo.save).toHaveBeenCalledWith('user-1', NotificationType.FRIEND_REQUEST, {});
      expect(mockGateway.sendToUser).toHaveBeenCalledWith('user-1', 'notification', {
        type: NotificationType.FRIEND_REQUEST,
        payload: {},
      });
      expect(result.id).toBe('notif-1');
    });
  });

  // ─── createBulk ────────────────────────────────────────────────────────────
  describe('createBulk', () => {
    it('does nothing when userIds is empty', async () => {
      await service.createBulk([], { title: 'Announcement' });
      expect(mockRepo.saveBulk).not.toHaveBeenCalled();
      expect(mockGateway.sendToUser).not.toHaveBeenCalled();
    });

    it('sends to all users when userIds provided', async () => {
      mockRepo.saveBulk.mockResolvedValue(undefined);
      await service.createBulk(['user-1', 'user-2'], { title: 'Announcement' });
      expect(mockRepo.saveBulk).toHaveBeenCalledTimes(1);
      expect(mockGateway.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  // ─── getUserNotifications ──────────────────────────────────────────────────
  describe('getUserNotifications', () => {
    it('returns paginated notifications', async () => {
      const page = { items: [makeNotification()], total: 1 };
      mockRepo.findByUserId.mockResolvedValue(page);

      const result = await service.getUserNotifications('user-1', 1, 50);

      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1', 0, 50);
      expect(result.total).toBe(1);
    });

    it('uses page 1 and limit 50 as defaults', async () => {
      mockRepo.findByUserId.mockResolvedValue({ items: [], total: 0 });
      await service.getUserNotifications('user-1');
      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1', 0, 50);
    });
  });

  // ─── markAsRead ────────────────────────────────────────────────────────────
  describe('markAsRead', () => {
    it('delegates to repository', async () => {
      mockRepo.markAsRead.mockResolvedValue(undefined);
      await service.markAsRead('notif-1', 'user-1');
      expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });
  });

  // ─── markAllAsRead ─────────────────────────────────────────────────────────
  describe('markAllAsRead', () => {
    it('delegates to repository', async () => {
      mockRepo.markAllAsRead.mockResolvedValue(undefined);
      await service.markAllAsRead('user-1');
      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── deleteNotification ────────────────────────────────────────────────────
  describe('deleteNotification', () => {
    it('delegates to repository', async () => {
      mockRepo.deleteOne.mockResolvedValue(undefined);
      await service.deleteNotification('notif-1', 'user-1');
      expect(mockRepo.deleteOne).toHaveBeenCalledWith('notif-1', 'user-1');
    });
  });

  // ─── deleteAllNotifications ────────────────────────────────────────────────
  describe('deleteAllNotifications', () => {
    it('delegates to repository', async () => {
      mockRepo.deleteAll.mockResolvedValue(undefined);
      await service.deleteAllNotifications('user-1');
      expect(mockRepo.deleteAll).toHaveBeenCalledWith('user-1');
    });
  });
});
