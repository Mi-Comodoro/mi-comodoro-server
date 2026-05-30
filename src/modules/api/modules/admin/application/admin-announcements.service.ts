import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountType } from '@/common/enums/account-type.enum';
import { LoggerProviderService } from '@/core/providers';
import { NotificationsService } from '@/modules/api/modules/notifications/application/services/notifications.service';
import { UserProfileEntity } from '@/modules/api/modules/user-profile/infrastructure/database/entities/user-profile.entity';

import { AnnouncementEntity } from '../infrastructure/database/entities/announcement.entity';
import { AnnouncementSegment, CreateAnnouncementDto } from '../infrastructure/dto/announcement.dto';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AdminAnnouncementsService {
  private readonly context = AdminAnnouncementsService.name;

  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly announcementRepo: Repository<AnnouncementEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepo: Repository<UserProfileEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
    private readonly logger: LoggerProviderService,
  ) {}

  async previewCount(segment: AnnouncementSegment): Promise<number> {
    const accountTypes = this.resolveAccountTypes(segment);
    const query = this.userProfileRepo
      .createQueryBuilder('up')
      .where('up.isActive = :isActive', { isActive: true });
    if (accountTypes) {
      query.andWhere('up.accountType IN (:...types)', { types: accountTypes });
    }
    return query.getCount();
  }

  async send(
    dto: CreateAnnouncementDto,
    adminId: string,
    adminEmail: string,
    ip?: string | null,
  ): Promise<{ id: string; recipientCount: number }> {
    this.logger.info(
      this.context,
      `Sending announcement segment=${dto.segment} by admin=${adminId}`,
    );
    const userIds = await this.getUserIdsBySegment(dto.segment);
    const recipientCount = userIds.length;

    const announcement = this.announcementRepo.create({
      title: dto.title,
      body: dto.body,
      segment: dto.segment,
      sentBy: adminId,
      sentAt: new Date(),
      recipientCount,
    });
    const saved = await this.announcementRepo.save(announcement);

    await this.notificationsService.createBulk(userIds, { title: dto.title, body: dto.body });

    await this.auditLogService.log({
      adminId,
      adminHandle: adminEmail,
      action: 'ANNOUNCEMENT_SENT',
      targetId: saved.id,
      targetType: 'announcement',
      before: null,
      after: { title: dto.title, segment: dto.segment, recipientCount },
      ip: ip ?? null,
    });

    this.logger.info(this.context, `Announcement ${saved.id} sent to ${recipientCount} users`);
    return { id: saved.id, recipientCount };
  }

  async list(): Promise<AnnouncementEntity[]> {
    return this.announcementRepo.find({ order: { sentAt: 'DESC' }, take: 100 });
  }

  private async getUserIdsBySegment(segment: AnnouncementSegment): Promise<string[]> {
    const accountTypes = this.resolveAccountTypes(segment);
    const query = this.userProfileRepo
      .createQueryBuilder('up')
      .select('up.userId', 'userId')
      .where('up.isActive = :isActive', { isActive: true });
    if (accountTypes) {
      query.andWhere('up.accountType IN (:...types)', { types: accountTypes });
    }
    const rows = await query.getRawMany<{ userId: string }>();
    return rows.map((r) => r.userId);
  }

  private resolveAccountTypes(segment: AnnouncementSegment): AccountType[] | null {
    const map: Partial<Record<AnnouncementSegment, AccountType[]>> = {
      [AnnouncementSegment.FREE]: [AccountType.FREE],
      [AnnouncementSegment.TRIAL]: [AccountType.TRIAL],
      [AnnouncementSegment.PLUS]: [AccountType.PLUS],
      [AnnouncementSegment.PRO]: [AccountType.PRO],
      [AnnouncementSegment.PARTNER]: [AccountType.PARTNER],
    };
    return map[segment] ?? null;
  }
}
