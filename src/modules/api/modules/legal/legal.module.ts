import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { ConsentService } from './application/services/consent.service';
import { LegalController } from './infrastructure/controller/legal.controller';
import { UserConsentEntity } from './infrastructure/database/entities/user-consent.entity';
import { UserConsentRepositoryImpl } from './infrastructure/repositories/user-consent.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([UserConsentEntity])],
  controllers: [LegalController],
  providers: [
    ConsentService,
    LoggerProviderService,
    { provide: 'UserConsentRepository', useClass: UserConsentRepositoryImpl },
  ],
  exports: [ConsentService],
})
export class LegalModule {}
