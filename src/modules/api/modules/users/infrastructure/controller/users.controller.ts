import { Body, Controller, Get, HttpCode, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { UsersService } from '../../application/services/users.service';
import { CheckPhoneQueryDto, CheckPhoneResponseDto } from '../dto/check-phone.dto';
import { WrapperResponseMeDto } from '../dto/me.dto';
import { OnboardingDto } from '../dto/onboarding.dto';
import { SearchUsersQueryDto } from '../dto/search-users.dto';
import { UpdateHandleDto } from '../dto/update-handle.dto';
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
  @ApiOperation({ summary: 'Verificar disponibilidad de número de teléfono' })
  @ApiQuery({ name: 'phone', required: true, example: '+573001234567' })
  @ApiOkResponse({
    type: CheckPhoneResponseDto,
    description: 'Disponibilidad del número consultado',
  })
  @ApiErrorResponse(400, 'Formato de teléfono inválido')
  @ApiErrorResponse(500, 'Error interno del servidor')
  async checkPhone(@Query() query: CheckPhoneQueryDto) {
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

  @Patch('/me/handle')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar handle del usuario autenticado' })
  @ApiOkResponse({ description: 'Handle actualizado' })
  @ApiErrorResponse(401, 'Unauthorized')
  @ApiErrorResponse(409, 'Handle ya en uso')
  async updateHandle(@CurrentUser() user: JwtPayload, @Body() dto: UpdateHandleDto) {
    this.logger.info(this.context, `Updating handle for user ${user.userId}`);
    return await this.userService.updateHandle(user.userId, dto);
  }

  @Get('/search')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Buscar usuarios por handle' })
  @ApiQuery({ name: 'q', required: true, example: 'miguel' })
  @ApiOkResponse({ description: 'Lista de usuarios encontrados' })
  @ApiErrorResponse(401, 'Unauthorized')
  async searchUsers(@CurrentUser() user: JwtPayload, @Query() query: SearchUsersQueryDto) {
    this.logger.info(this.context, `Searching users: ${query.q}`);
    return await this.userService.searchUsers(query.q, user.userId);
  }
}
