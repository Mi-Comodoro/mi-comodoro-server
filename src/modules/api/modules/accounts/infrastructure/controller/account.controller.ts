import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AccountService } from '../../application/services/account.service';
import { CreateAccountDto } from '../dto/account.dto';

@Controller('account')
export class AccountController {
  private readonly context: string = AccountController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly accountService: AccountService,
  ) {}
  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateAccountDto) {
    this.logger.info(this.context, 'creating savings account reference');
    const data = { ...body, userId: user.userId };
    return await this.accountService.create(data);
  }

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  async get(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'getting savings account reference');
    return await this.accountService.get(user.userId);
  }
}
