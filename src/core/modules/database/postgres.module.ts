import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseConfigModule } from '@/core/config/database/config.module';
import { DatabaseConfigService } from '@/core/config/database/config.service';
import { DatabaseProvider } from '@/core/providers';
import { InitialSchema20260610000000 } from '@/database/migrations/20260610000000-InitialSchema';
import { SeedCategories20260610000001 } from '@/database/migrations/20260610000001-SeedCategories';
import { SeedPlans20260610000002 } from '@/database/migrations/20260610000002-SeedPlans';

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
        migrationsRun: true,
        migrations: [
          InitialSchema20260610000000,
          SeedCategories20260610000001,
          SeedPlans20260610000002,
        ],
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
