import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingFinancesListener } from './application/onboarding-finances.listener';
import { FinancesEntity } from './infrastructure/database/entities/finances.entity';
import { FinancesRepositoryImpl } from './infrastructure/repositories/finances.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([FinancesEntity])],
  providers: [
    LoggerProviderService,
    OnboardingFinancesListener,
    {
      provide: 'FinancesRepository',
      useClass: FinancesRepositoryImpl,
    },
  ],
  controllers: [],
  exports: ['FinancesRepository'],
})
export class FinancesModule {}
