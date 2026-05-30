import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id' })
  adminId: string;

  @Column({ name: 'admin_handle' })
  adminHandle: string;

  @Column()
  action: string;

  @Column({ name: 'target_id', nullable: true, type: 'varchar' })
  targetId: string | null;

  @Column({ name: 'target_type', nullable: true, type: 'varchar' })
  targetType: string | null;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ nullable: true, type: 'varchar' })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
