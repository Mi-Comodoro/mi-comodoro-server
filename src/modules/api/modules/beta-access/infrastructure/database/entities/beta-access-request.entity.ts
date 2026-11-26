import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { BetaAccessStatus } from '../../../domain/beta-access-request';

@Entity('beta_access_requests')
export class BetaAccessRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: BetaAccessStatus;

  @Column({ name: 'policy_version', type: 'varchar', length: 20 })
  policyVersion: string;

  @Column({ name: 'consent_at', type: 'timestamptz', default: () => 'now()' })
  consentAt: Date;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'invite_token_hash', type: 'varchar', length: 64, nullable: true })
  inviteTokenHash: string | null;

  @Column({ name: 'invite_expires_at', type: 'timestamptz', nullable: true })
  inviteExpiresAt: Date | null;

  @Column({ name: 'registered_user_id', type: 'uuid', nullable: true })
  registeredUserId: string | null;

  @Column({ name: 'registered_at', type: 'timestamptz', nullable: true })
  registeredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
