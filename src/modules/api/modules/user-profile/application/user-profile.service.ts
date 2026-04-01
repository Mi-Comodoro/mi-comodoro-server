import { Inject, Injectable } from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { UserProfileRepository } from '../domain/user-profile.repository';

@Injectable()
export class UserProfileService {
  private readonly context: string = UserProfileService.name;
  constructor(
    private readonly logger: LoggerProviderService,
    @Inject('UserProfileRepository') private readonly accountRepository: UserProfileRepository,
  ) {}

  async getAccountById(accountId: string) {
    this.logger.info(this.context, `Getting user-profile with id: ${accountId}`);
    return await this.accountRepository.findById(accountId);
  }
}
