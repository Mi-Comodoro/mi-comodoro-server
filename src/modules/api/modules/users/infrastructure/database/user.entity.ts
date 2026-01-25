import { Column, Entity, OneToOne, PrimaryColumn } from 'typeorm';

import { AccountEntity } from '../../../account/infrastructure/database/account.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password' })
  password: string;

  @OneToOne(() => AccountEntity, (account) => account.user)
  account: AccountEntity;
}
