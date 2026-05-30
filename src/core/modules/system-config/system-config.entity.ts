import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_config')
export class SystemConfigEntity {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;

  @Column({ name: 'updated_by', nullable: true, type: 'varchar' })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
