import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import type { GroupMember, MemberRole, MemberStatus } from '../../../domain/group-member';

@Entity('group_members')
export class GroupMemberEntity implements GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({
    type: 'enum',
    enum: ['ORGANIZER', 'CO_ORGANIZER', 'MEMBER', 'VIEWER'],
    default: 'MEMBER',
  })
  role: MemberRole;

  @Column({
    name: 'member_status',
    type: 'enum',
    enum: ['active', 'invited', 'external'],
    default: 'active',
  })
  memberStatus: MemberStatus;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'external_name', type: 'varchar', nullable: true })
  externalName?: string | null;

  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
