import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Category, CategoryBucket, CategoryType } from '../../domain/category';

@Entity('categories')
export class CategoryEntity implements Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;
  @Column({
    type: 'enum',
    enum: CategoryType,
  })
  type: CategoryType;
  @Column({
    type: 'enum',
    enum: CategoryBucket,
    nullable: true,
  })
  bucket?: CategoryBucket;

  @Column({ nullable: true, name: 'parent_id' })
  parentId?: string;
  @ManyToOne(() => CategoryEntity, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: CategoryEntity;
  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children: CategoryEntity[];
  @Column({ default: true })
  isSelectable: boolean;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
