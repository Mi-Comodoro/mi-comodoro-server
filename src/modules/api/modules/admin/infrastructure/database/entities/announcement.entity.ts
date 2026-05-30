import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('announcements')
export class AnnouncementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', default: 'all' })
  segment: string;

  @Column({ name: 'sent_by' })
  sentBy: string;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;

  @Column({ name: 'recipient_count', default: 0 })
  recipientCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
