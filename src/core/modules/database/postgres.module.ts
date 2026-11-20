import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseConfigModule } from '@/core/config/database/config.module';
import { DatabaseConfigService } from '@/core/config/database/config.service';
import { buildPoolOptions } from '@/core/config/database/pool.config';
import { DatabaseProvider } from '@/core/providers';
import { MIGRATIONS } from '@/database/migrations.registry';

@Module({
  imports: [
    DatabaseConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [DatabaseConfigModule],
      inject: [DatabaseConfigService],
      useFactory: async (configService: DatabaseConfigService) => ({
        type: 'postgres',
        autoLoadEntities: true,
        synchronize: false,
        migrations: MIGRATIONS,
        ...buildPoolOptions(),
        host: configService.host,
        port: Number(configService.port),
        username: configService.username,
        password: configService.password,
        database: configService.database,
      }),
    }),
  ],
  providers: [DatabaseProvider],
})
export class DatabaseModule {}
