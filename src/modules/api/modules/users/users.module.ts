import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { BudgetModule } from '../budgets/budget.module';
import { FinancesModule } from '../finances/finances.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { OnboardingResponseListener } from './application/onboarding.listener';
import { UsersService } from './application/services/users.service';
import { UsersController } from './infrastructure/controller/users.controller';
import { UserEntity } from './infrastructure/database/user.entity';
import { UserRepositoryImpl } from './infrastructure/repository/user.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    FinancesModule,
    BudgetModule,
    UserProfileModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    LoggerProviderService,
    OnboardingResponseListener,
    {
      provide: 'UserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
