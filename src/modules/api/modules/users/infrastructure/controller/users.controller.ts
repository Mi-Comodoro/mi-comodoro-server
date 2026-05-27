import { Body, Controller, Get, HttpCode, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { UsersService } from '../../application/services/users.service';
import { CheckPhoneQueryDto, CheckPhoneResponseDto } from '../dto/check-phone.dto';
import { WrapperResponseMeDto } from '../dto/me.dto';
import { OnboardingDto } from '../dto/onboarding.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly context: string = UsersController.name;
  constructor(
    private readonly userService: UsersService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Get('/check-phone')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificar disponibilidad de número de teléfono' })
  @ApiQuery({ name: 'phone', required: true, example: '+573001234567' })
  @ApiOkResponse({ type: CheckPhoneResponseDto })
  @ApiErrorResponse(400, 'Formato de teléfono inválido')
  async checkPhone(@Query() query: CheckPhoneQueryDto) {
    this.logger.info(this.context, `Verificando teléfono`);
    return await this.userService.checkPhoneAvailability(query.phone);
  }

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

  @Patch('/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar datos de perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil actualizado' })
  @ApiErrorResponse(401, 'Unauthorized')
  @ApiErrorResponse(404, 'User profile not found')
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    this.logger.info(this.context, `Updating profile for user ${user.userId}`);
    return await this.userService.updateMe(user.userId, dto);
  }
}
