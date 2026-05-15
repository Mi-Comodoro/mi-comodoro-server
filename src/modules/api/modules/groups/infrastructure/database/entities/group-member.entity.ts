import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import type { GroupMember, MemberRole } from '../../../domain/group-member';

@Entity('group_members')
export class GroupMemberEntity implements GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['OWNER', 'EDITOR', 'VIEWER'],
    default: 'VIEWER',
  })
  role: MemberRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
