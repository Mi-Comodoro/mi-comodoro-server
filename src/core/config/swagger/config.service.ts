import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import swaggerRegister from './register';

@Injectable()
export class SwaggerConfigService {
  constructor(
    @Inject(swaggerRegister.KEY)
    private readonly config: ConfigType<typeof swaggerRegister>,
  ) {}

  get title(): string {
    return this.config.title;
  }
  get description(): string {
    return this.config.description;
  }
  get version(): string {
    return this.config.version;
  }
  get envName(): string {
    return this.config.envName;
  }
  get url(): string {
    return this.config.url;
  }
  get tag(): string {
    return this.config.tag;
  }
  get path(): string {
    return this.config.path;
  }
}
