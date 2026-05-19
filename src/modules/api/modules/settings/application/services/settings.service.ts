import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { SettingsRepository } from '../../domain/repositories/settings.repository';
import { UpdateBudgetDefaultsDto, UpdateSettingsDto } from '../../infrastructure/dto/settings.dto';

@Injectable()
export class SettingsService {
  private readonly context: string = SettingsService.name;

  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('SettingsRepository')
    private readonly settingsRepository: SettingsRepository,
  ) {}

  async getSettings(userId: string) {
    this.logger.info(this.context, `Getting settings for user ${userId}`);
    return await this.settingsRepository.upsert(userId);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    this.logger.info(this.context, `Updating settings for user ${userId}`);
    const existing = await this.settingsRepository.findByUserId(userId);
    if (!existing) {
      throw new NotFoundException('Settings not found');
    }
    return await this.settingsRepository.update(userId, dto);
  }

  async updateBudgetDefaults(userId: string, dto: UpdateBudgetDefaultsDto) {
    this.logger.info(this.context, `Updating budget defaults for user ${userId}`);
    const existing = await this.settingsRepository.findByUserId(userId);
    if (!existing) {
      throw new NotFoundException('Settings not found');
    }
    return await this.settingsRepository.update(userId, dto);
  }
}
