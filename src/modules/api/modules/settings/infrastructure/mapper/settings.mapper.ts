import { Settings } from '../../domain/settings';
import { SettingsEntity } from '../database/entities/settings.entity';

export class SettingsMapper {
  static toDomain(entity: SettingsEntity): Settings {
    return {
      id: entity.id,
      userId: entity.userId,
      currency: entity.currency,
      language: entity.language,
      notificationsEnabled: entity.notificationsEnabled,
      budgetAlertThreshold: entity.budgetAlertThreshold,
      savingsPercentage: Number(entity.savingsPercentage),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
