import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { NotificationsService } from '../../../../notifications/application/services/notifications.service';
import { NotificationsGateway } from '../../../../notifications/infrastructure/gateway/notifications.gateway';
import { FriendshipStatus } from '../../../domain/enums/friendship-status.enum';
import { FriendshipsService } from '../friendships.service';

const mockFriendshipRepo = {
  findByPair: jest.fn(),
  save: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
  findAcceptedByUserIdWithProfiles: jest.fn(),
  findReceivedPending: jest.fn(),
  findSentPending: jest.fn(),
};

const mockUserRepo = {
  findByHandle: jest.fn(),
  findById: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
const mockNotificationsService = { createNotification: jest.fn() };
const mockNotificationsGateway = { sendToUser: jest.fn() };

const makeFriendship = (overrides = {}) => ({
  id: 'friendship-1',
  requesterId: 'user-1',
  addresseeId: 'user-2',
  status: FriendshipStatus.PENDING,
  ...overrides,
});

describe('FriendshipsService', () => {
  let service: FriendshipsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipsService,
        { provide: 'FriendshipRepository', useValue: mockFriendshipRepo },
        { provide: 'UserRepository', useValue: mockUserRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
      ],
    }).compile();

    service = module.get<FriendshipsService>(FriendshipsService);
    jest.clearAllMocks();
  });

  // ─── sendRequest ──────────────────────────────────────────────────────────
  describe('sendRequest', () => {
    it('throws NotFoundException when addressee not found', async () => {
      mockUserRepo.findByHandle.mockResolvedValue(null);
      await expect(service.sendRequest('user-1', 'unknown')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when sending to self', async () => {
      mockUserRepo.findByHandle.mockResolvedValue({ id: 'user-1' });
      await expect(service.sendRequest('user-1', 'myself')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when friendship already exists', async () => {
      mockUserRepo.findByHandle.mockResolvedValue({ id: 'user-2' });
      mockFriendshipRepo.findByPair.mockResolvedValue(makeFriendship());
      await expect(service.sendRequest('user-1', 'user2handle')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when reverse friendship exists', async () => {
      mockUserRepo.findByHandle.mockResolvedValue({ id: 'user-2' });
      mockFriendshipRepo.findByPair
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeFriendship());
      await expect(service.sendRequest('user-1', 'user2handle')).rejects.toThrow(ConflictException);
    });

    it('saves friendship and sends notification on success', async () => {
      mockUserRepo.findByHandle.mockResolvedValue({ id: 'user-2' });
      mockFriendshipRepo.findByPair.mockResolvedValue(null);
      mockFriendshipRepo.save.mockResolvedValue(makeFriendship());
      mockUserRepo.findById.mockResolvedValue({
        handle: 'user1handle',
        userProfile: { displayName: 'User One' },
      });
      mockNotificationsService.createNotification.mockResolvedValue({ id: 'notif-1' });

      const result = await service.sendRequest('user-1', 'user2handle');

      expect(mockFriendshipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: 'user-1',
          addresseeId: 'user-2',
          status: FriendshipStatus.PENDING,
        }),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationsGateway.sendToUser).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('friendship-1');
    });
  });

  // ─── acceptRequest ────────────────────────────────────────────────────────
  describe('acceptRequest', () => {
    it('throws NotFoundException when friendship not found', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(null);
      await expect(service.acceptRequest('user-2', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when friendship is not PENDING', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(
        makeFriendship({ status: FriendshipStatus.ACCEPTED }),
      );
      await expect(service.acceptRequest('user-2', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when addresseeId does not match', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(makeFriendship({ addresseeId: 'user-3' }));
      await expect(service.acceptRequest('user-2', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('updates status to ACCEPTED and returns success', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(makeFriendship());
      mockFriendshipRepo.updateStatus.mockResolvedValue(undefined);
      mockUserRepo.findById.mockResolvedValue({ handle: 'user2handle', userProfile: null });
      mockNotificationsService.createNotification.mockResolvedValue({ id: 'notif-1' });

      const result = await service.acceptRequest('user-2', 'user-1');

      expect(mockFriendshipRepo.updateStatus).toHaveBeenCalledWith(
        'friendship-1',
        FriendshipStatus.ACCEPTED,
      );
      expect(result.success).toBe(true);
    });
  });

  // ─── rejectRequest ────────────────────────────────────────────────────────
  describe('rejectRequest', () => {
    it('throws NotFoundException when friendship not found', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(null);
      await expect(service.rejectRequest('user-2', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when addresseeId does not match', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(makeFriendship({ addresseeId: 'user-3' }));
      await expect(service.rejectRequest('user-2', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('deletes friendship and returns success', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(makeFriendship());
      mockFriendshipRepo.delete.mockResolvedValue(undefined);
      mockUserRepo.findById.mockResolvedValue({ handle: 'user2handle', userProfile: null });
      mockNotificationsService.createNotification.mockResolvedValue({ id: 'notif-1' });

      const result = await service.rejectRequest('user-2', 'user-1');

      expect(mockFriendshipRepo.delete).toHaveBeenCalledWith('friendship-1');
      expect(result.success).toBe(true);
    });
  });

  // ─── blockUser ────────────────────────────────────────────────────────────
  describe('blockUser', () => {
    it('updates existing friendship to BLOCKED', async () => {
      mockFriendshipRepo.findByPair
        .mockResolvedValueOnce(makeFriendship({ id: 'f-1' }))
        .mockResolvedValueOnce(null);
      mockFriendshipRepo.updateStatus.mockResolvedValue(undefined);

      const result = await service.blockUser('user-1', 'user-2');

      expect(mockFriendshipRepo.updateStatus).toHaveBeenCalledWith('f-1', FriendshipStatus.BLOCKED);
      expect(result.success).toBe(true);
    });

    it('updates reverse friendship to BLOCKED when no direct friendship', async () => {
      mockFriendshipRepo.findByPair
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeFriendship({ id: 'f-2' }));
      mockFriendshipRepo.updateStatus.mockResolvedValue(undefined);

      const result = await service.blockUser('user-1', 'user-2');

      expect(mockFriendshipRepo.updateStatus).toHaveBeenCalledWith('f-2', FriendshipStatus.BLOCKED);
      expect(result.success).toBe(true);
    });

    it('creates new BLOCKED friendship when none exists', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(null);
      mockFriendshipRepo.save.mockResolvedValue(
        makeFriendship({ status: FriendshipStatus.BLOCKED }),
      );

      const result = await service.blockUser('user-1', 'user-2');

      expect(mockFriendshipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: 'user-1',
          addresseeId: 'user-2',
          status: FriendshipStatus.BLOCKED,
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  // ─── removeFriend ─────────────────────────────────────────────────────────
  describe('removeFriend', () => {
    it('throws NotFoundException when no friendship found', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(null);
      await expect(service.removeFriend('user-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when friendship is not ACCEPTED', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(
        makeFriendship({ status: FriendshipStatus.PENDING }),
      );
      await expect(service.removeFriend('user-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('deletes accepted friendship and returns success', async () => {
      mockFriendshipRepo.findByPair.mockResolvedValue(
        makeFriendship({ status: FriendshipStatus.ACCEPTED }),
      );
      mockFriendshipRepo.delete.mockResolvedValue(undefined);

      const result = await service.removeFriend('user-1', 'user-2');

      expect(mockFriendshipRepo.delete).toHaveBeenCalledWith('friendship-1');
      expect(result.success).toBe(true);
    });
  });

  // ─── getFriends / getReceivedRequests / getSentRequests ───────────────────
  describe('getFriends', () => {
    it('returns friends list', async () => {
      mockFriendshipRepo.findAcceptedByUserIdWithProfiles.mockResolvedValue([{ id: 'f-1' }]);
      const result = await service.getFriends('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getReceivedRequests', () => {
    it('returns received pending requests', async () => {
      mockFriendshipRepo.findReceivedPending.mockResolvedValue([{ id: 'f-1' }]);
      const result = await service.getReceivedRequests('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getSentRequests', () => {
    it('returns sent pending requests', async () => {
      mockFriendshipRepo.findSentPending.mockResolvedValue([{ id: 'f-1' }, { id: 'f-2' }]);
      const result = await service.getSentRequests('user-1');
      expect(result).toHaveLength(2);
    });
  });
});
