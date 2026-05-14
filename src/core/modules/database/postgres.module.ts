import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseConfigModule } from '@/core/config/database/config.module';
import { DatabaseConfigService } from '@/core/config/database/config.service';
import { DatabaseProvider } from '@/core/providers';

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
        migrations: ['dist/database/migrations/*.js'],
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
