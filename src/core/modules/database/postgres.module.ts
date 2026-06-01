import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseConfigModule } from '@/core/config/database/config.module';
import { DatabaseConfigService } from '@/core/config/database/config.service';
import { DatabaseProvider } from '@/core/providers';
import { InitialSchema20260514000000 } from '@/database/migrations/20260514000000-InitialSchema';
import { SeedCategoriesData20260527000000 } from '@/database/migrations/20260527000000-SeedCategoriesData';
import { FixBillsTableStructure20260531100000 } from '@/database/migrations/20260531100000-FixBillsTableStructure';

@Module({
  imports: [
    DatabaseConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [DatabaseConfigModule],
      inject: [DatabaseConfigService],
      useFactory: async (configService: DatabaseConfigService) => {
        const isProd = process.env.NODE_ENV === 'production';
        return {
          type: 'postgres',
          autoLoadEntities: true,
          synchronize: !isProd,
          migrationsRun: isProd,
          migrations: isProd
            ? [
                InitialSchema20260514000000,
                SeedCategoriesData20260527000000,
                FixBillsTableStructure20260531100000,
              ]
            : [],
          host: configService.host,
          port: Number(configService.port),
          username: configService.username,
          password: configService.password,
          database: configService.database,
        };
      },
    }),
  ],
  providers: [DatabaseProvider],
})
export class DatabaseModule {}
