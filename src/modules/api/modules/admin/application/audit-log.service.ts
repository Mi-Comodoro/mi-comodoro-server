import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { AuditLogEntity } from '../infrastructure/database/entities/audit-log.entity';
import { AuditLogQueryDto, CreateAuditLogDto } from '../infrastructure/dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly context = AuditLogService.name;

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entity = this.repo.create({
        adminId: dto.adminId,
        adminHandle: dto.adminHandle,
        action: dto.action,
        targetId: dto.targetId ?? null,
        targetType: dto.targetType ?? null,
        before: dto.before ?? null,
        after: dto.after ?? null,
        ip: dto.ip ?? null,
      });
      await this.repo.save(entity);
    } catch (err) {
      this.logger.error(this.context, `Failed to write audit log: ${String(err)}`);
    }
  }

  async findAll(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.repo.createQueryBuilder('al').orderBy('al.createdAt', 'DESC');

    if (query.action) {
      qb.andWhere('al.action = :action', { action: query.action });
    }
    if (query.targetType) {
      qb.andWhere('al.targetType = :targetType', { targetType: query.targetType });
    }
    if (query.from) {
      qb.andWhere('al.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('al.createdAt <= :to', { to: new Date(query.to) });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }
}
