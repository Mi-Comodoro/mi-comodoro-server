import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { SettingsService } from './application/services/settings.service';
import { SettingsController } from './infrastructure/controller/settings.controller';
import { SettingsEntity } from './infrastructure/database/entities/settings.entity';
import { SettingsRepositoryImpl } from './infrastructure/repositories/settings.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([SettingsEntity])],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    LoggerProviderService,
    {
      provide: 'SettingsRepository',
      useClass: SettingsRepositoryImpl,
    },
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
