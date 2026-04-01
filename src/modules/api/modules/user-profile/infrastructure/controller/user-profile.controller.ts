import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { UserProfileService } from '../../application/user-profile.service';
import { UserProfileResponseDto } from '../dto/user-profile.dto';

@Controller('user-profile')
export class UserProfileController {
  private readonly context: string = UserProfileController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Get('/me')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiErrorResponse(404, 'UserProfile not found')
  async getProfile(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'Getting user-profile data');
    const userProfile = await this.userProfileService.getAccountById(user.userProfileId as string);
    if (!userProfile) {
      throw new NotFoundException('user-profile not found');
    }
    return userProfile;
  }
}
