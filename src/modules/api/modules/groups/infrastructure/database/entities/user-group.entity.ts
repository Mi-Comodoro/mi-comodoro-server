import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { GroupStatus, GroupType, UserGroup } from '../../../domain/user-group';

@Entity('user_groups')
export class UserGroupEntity implements UserGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ['SHARED', 'FAMILIAR', 'TRAVEL'],
    default: 'SHARED',
  })
  type: GroupType;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: GroupStatus;

  @Column({ name: 'max_members', default: 5 })
  maxMembers: number;

  @Column({ name: 'nulled_at', type: 'timestamptz', nullable: true })
  nulledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
