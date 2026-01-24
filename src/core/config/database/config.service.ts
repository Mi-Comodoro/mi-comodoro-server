import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfigService {
  constructor(private readonly configService: ConfigService) {}
  get host(): string {
    return this.configService.get<string>('db.host', { infer: true }) ?? '';
  }
  get port(): number {
    return Number(this.configService.get<number>('db.port'));
  }
  get username(): string {
    return this.configService.get<string>('db.username', { infer: true }) ?? '';
  }
  get password(): string {
    return this.configService.get<string>('db.password', { infer: true }) ?? '';
  }
  get database(): string {
    return this.configService.get<string>('db.database', { infer: true }) ?? '';
  }
}
