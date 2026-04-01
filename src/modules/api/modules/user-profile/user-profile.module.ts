import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { OnboardingAccountListener } from './application/user-profile.listener';
import { UserProfileService } from './application/user-profile.service';
import { UserProfileController } from './infrastructure/controller/user-profile.controller';
import { UserProfileEntity } from './infrastructure/database/entities/user-profile.entity';
import { UserProfileRepositoryImpl } from './infrastructure/repository/user-profile.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfileEntity])],
  providers: [
    UserProfileService,
    LoggerProviderService,
    OnboardingAccountListener,
    {
      provide: 'UserProfileRepository',
      useClass: UserProfileRepositoryImpl,
    },
  ],
  controllers: [UserProfileController],
  exports: [UserProfileService, 'UserProfileRepository'],
})
export class UserProfileModule {}
