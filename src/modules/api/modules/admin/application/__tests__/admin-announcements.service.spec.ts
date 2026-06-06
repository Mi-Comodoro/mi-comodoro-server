import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';
import { UserProfileEntity } from '@/modules/api/modules/user-profile/infrastructure/database/entities/user-profile.entity';

import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { AnnouncementEntity } from '../../infrastructure/database/entities/announcement.entity';
import { AnnouncementSegment } from '../../infrastructure/dto/announcement.dto';
import { AdminAnnouncementsService } from '../admin-announcements.service';
import { AuditLogService } from '../audit-log.service';

const mockQb = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
  getRawMany: jest.fn(),
};

const mockAnnouncementRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockUserProfileRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

const mockNotificationsService = { createBulk: jest.fn() };
const mockAuditLogService = { log: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('AdminAnnouncementsService', () => {
  let service: AdminAnnouncementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnnouncementsService,
        { provide: getRepositoryToken(AnnouncementEntity), useValue: mockAnnouncementRepo },
        { provide: getRepositoryToken(UserProfileEntity), useValue: mockUserProfileRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AdminAnnouncementsService>(AdminAnnouncementsService);
    jest.clearAllMocks();
    mockUserProfileRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockQb.where.mockReturnThis();
    mockQb.andWhere.mockReturnThis();
    mockQb.select.mockReturnThis();
  });

  // ─── list ──────────────────────────────────────────────────────────────────
  describe('list', () => {
    it('returns announcements ordered by sentAt DESC', async () => {
      const announcements = [{ id: 'ann-1', title: 'Test' }];
      mockAnnouncementRepo.find.mockResolvedValue(announcements);
      const result = await service.list();
      expect(result).toEqual(announcements);
    });
  });

  // ─── previewCount ──────────────────────────────────────────────────────────
  describe('previewCount', () => {
    it('returns count without segment filter for ALL segment', async () => {
      mockQb.getCount.mockResolvedValue(100);
      const result = await service.previewCount(AnnouncementSegment.ALL);
      expect(result).toBe(100);
      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('adds account type filter for FREE segment', async () => {
      mockQb.getCount.mockResolvedValue(20);
      const result = await service.previewCount(AnnouncementSegment.FREE);
      expect(result).toBe(20);
      expect(mockQb.andWhere).toHaveBeenCalledTimes(1);
    });

    it('adds account type filter for PLUS segment', async () => {
      mockQb.getCount.mockResolvedValue(10);
      const result = await service.previewCount(AnnouncementSegment.PLUS);
      expect(result).toBe(10);
      expect(mockQb.andWhere).toHaveBeenCalledTimes(1);
    });
  });

  // ─── send ──────────────────────────────────────────────────────────────────
  describe('send', () => {
    it('creates announcement and sends notifications', async () => {
      mockQb.getRawMany.mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]);
      const savedAnn = { id: 'ann-1', title: 'Test Announcement' };
      mockAnnouncementRepo.create.mockReturnValue(savedAnn);
      mockAnnouncementRepo.save.mockResolvedValue(savedAnn);
      mockNotificationsService.createBulk.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);

      const dto = { title: 'Test', body: 'Body', segment: AnnouncementSegment.ALL };
      const result = await service.send(dto, 'admin-1', 'admin@test.com');

      expect(result.id).toBe('ann-1');
      expect(result.recipientCount).toBe(2);
      expect(mockNotificationsService.createBulk).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        expect.any(Object),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledTimes(1);
    });
  });
});
