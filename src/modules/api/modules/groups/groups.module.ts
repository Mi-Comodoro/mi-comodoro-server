import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupMemberEntity } from './infrastructure/database/entities/group-member.entity';
import { UserGroupEntity } from './infrastructure/database/entities/user-group.entity';
import { GroupMemberRepositoryImpl } from './infrastructure/repositories/group-member.repository.impl';
import { UserGroupRepositoryImpl } from './infrastructure/repositories/user-group.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([UserGroupEntity, GroupMemberEntity])],
  providers: [
    {
      provide: 'UserGroupRepository',
      useClass: UserGroupRepositoryImpl,
    },
    {
      provide: 'GroupMemberRepository',
      useClass: GroupMemberRepositoryImpl,
    },
  ],
  exports: ['UserGroupRepository', 'GroupMemberRepository'],
})
export class GroupsModule {}
