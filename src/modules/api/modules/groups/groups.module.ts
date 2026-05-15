import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserGroupEntity } from './infrastructure/database/entities/user-group.entity';
import { UserGroupRepositoryImpl } from './infrastructure/repositories/user-group.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([UserGroupEntity])],
  providers: [
    {
      provide: 'UserGroupRepository',
      useClass: UserGroupRepositoryImpl,
    },
  ],
  exports: ['UserGroupRepository'],
})
export class GroupsModule {}
