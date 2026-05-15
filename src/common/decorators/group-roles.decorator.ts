import { SetMetadata } from '@nestjs/common';

import type { MemberRole } from '@/modules/api/modules/groups/domain/group-member';

export const GROUP_ROLES_KEY = 'groupRoles';

export const GroupRoles = (...roles: MemberRole[]): MethodDecorator =>
  SetMetadata(GROUP_ROLES_KEY, roles);
