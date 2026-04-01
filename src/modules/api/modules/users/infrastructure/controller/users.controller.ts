import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { UsersService } from '../../application/services/users.service';
import { WrapperResponseMeDto } from '../dto/me.dto';
import { OnboardingDto } from '../dto/onboarding.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly context: string = UsersController.name;
  constructor(
    private readonly userService: UsersService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Post('/onboarding')
  @UseGuards(AuthGuard('jwt'))
  async onboarding(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: OnboardingDto,
  ) {
    this.logger.info(
      this.context,
      `Onboarding user with token payload userId=${user.userId}, email=${user.email}, tokenVersion=${user.tokenVersion ?? 0}`,
    );
    console.log('Received onboarding data:', body);
    return await this.userService.onboardingByUserId(user.userId, body);
  }

  @Get('/me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @ApiOkResponse({ type: WrapperResponseMeDto })
  @ApiErrorResponse(401, 'Unauthorized')
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'Getting current user information');
    return await this.userService.getCurrentUser(user);
  }
}
