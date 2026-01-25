import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AccountService } from '../../application/account.service';
import { AccountResponseDto } from '../dto/account.dto';

@Controller('account')
export class AccountController {
  private readonly context: string = AccountController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly accountService: AccountService,
  ) {}

  @Get('/me')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiErrorResponse(404, 'Account not found')
  async getProfile(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'Getting account data');
    const account = await this.accountService.getAccountById(user.accountId as string);
    if (!account) {
      throw new NotFoundException('account not found');
    }
    return account;
  }
}
