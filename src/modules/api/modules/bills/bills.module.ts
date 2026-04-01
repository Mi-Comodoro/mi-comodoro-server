import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillsEntity } from './infrastructure/database/bills.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BillsEntity])],
})
export class BillsModule {}
