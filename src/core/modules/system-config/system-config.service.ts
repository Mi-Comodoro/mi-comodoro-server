import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { SystemConfigEntity } from './system-config.entity';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class SystemConfigService {
  private readonly context = SystemConfigService.name;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000;

  constructor(
    @InjectRepository(SystemConfigEntity)
    private readonly repo: Repository<SystemConfigEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async findAll(): Promise<SystemConfigEntity[]> {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async get(key: string, defaultValue?: string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const config = await this.repo.findOne({ where: { key } });
    const value = config?.value ?? defaultValue ?? '';
    this.cache.set(key, { value, expiresAt: Date.now() + this.TTL });
    return value;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const raw = await this.get(key, String(defaultValue));
    const parsed = Number(raw);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const raw = await this.get(key, String(defaultValue));
    return raw === 'true';
  }

  async set(key: string, value: string, adminId: string): Promise<void> {
    this.logger.info(this.context, `Actualizando config: ${key}=${value} por admin ${adminId}`);
    await this.repo.upsert({ key, value, updatedBy: adminId }, ['key']);
    this.cache.delete(key);
  }
}
