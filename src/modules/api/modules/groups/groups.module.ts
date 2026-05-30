import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupsService } from './application/groups.service';
import { GroupsController } from './infrastructure/controller/groups.controller';
import { GroupContributionEntity } from './infrastructure/database/entities/group-contribution.entity';
import { GroupExpenseEntity } from './infrastructure/database/entities/group-expense.entity';
import { GroupMemberEntity } from './infrastructure/database/entities/group-member.entity';
import { UserGroupEntity } from './infrastructure/database/entities/user-group.entity';
import { GroupRolesGuard } from './infrastructure/guards/group-roles.guard';
import { GroupContributionRepositoryImpl } from './infrastructure/repositories/group-contribution.repository.impl';
import { GroupExpenseRepositoryImpl } from './infrastructure/repositories/group-expense.repository.impl';
import { GroupMemberRepositoryImpl } from './infrastructure/repositories/group-member.repository.impl';
import { UserGroupRepositoryImpl } from './infrastructure/repositories/user-group.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserGroupEntity,
      GroupMemberEntity,
      GroupExpenseEntity,
      GroupContributionEntity,
    ]),
  ],
  providers: [
    GroupsService,
    GroupRolesGuard,
    { provide: 'UserGroupRepository', useClass: UserGroupRepositoryImpl },
    { provide: 'GroupMemberRepository', useClass: GroupMemberRepositoryImpl },
    { provide: 'GroupExpenseRepository', useClass: GroupExpenseRepositoryImpl },
    { provide: 'GroupContributionRepository', useClass: GroupContributionRepositoryImpl },
  ],
  controllers: [GroupsController],
  exports: ['UserGroupRepository', 'GroupMemberRepository'],
})
export class GroupsModule {}
