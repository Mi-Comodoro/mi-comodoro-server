import { Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { usePassword } from '@/common/utils';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AuthService } from '../../application/auth.service';
import {
  GoogleSignInDto,
  GoogleSignInResponseDto,
  LogoutResponseDto,
  RefreshDto,
  RefreshResponseDto,
  SignInDto,
  SignInResponseDto,
  SignUpDto,
  SignUpResponseDto,
} from '../dto/';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly context: string = AuthController.name;
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Post('/signup')
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Registrar un nuevo usuario local' })
  @ApiCreatedResponse({ type: SignUpResponseDto })
  @ApiErrorResponse(400, 'Invalid request data')
  @ApiErrorResponse(409, 'User already exists')
  async signup(@Body() body: SignUpDto, @Headers('user-agent') userAgent?: string) {
    this.logger.info(this.context, 'creating user user-profile');
    const { passwordHash } = usePassword();
    const hash = await passwordHash(body.password);

    const data = {
      email: body.email,
      name: body.name,
      displayName: body.displayName,
      gender: body.gender,
      country: body.country,
      usageType: body.usageType,
      financialProfile: body.financialProfile,
      plan: body.plan,
      phone: body.phone,
      handle: body.handle,
      passwordHash: hash,
    };
    return await this.authService.signup(data, userAgent);
  }

  @Post('/signin')
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesion con email y contrasena' })
  @ApiOkResponse({ type: SignInResponseDto })
  @ApiErrorResponse(400, 'Invalid request data')
  @ApiErrorResponse(404, 'User not found')
  async signin(@Body() body: SignInDto, @Headers('user-agent') userAgent?: string) {
    this.logger.info(this.context, 'Logging into the user user-profile');
    return await this.authService.signin(body, userAgent);
  }

  @Post('/google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesion con Google usando un Firebase ID token' })
  @ApiOkResponse({ type: GoogleSignInResponseDto })
  @ApiErrorResponse(400, 'Invalid request data')
  async loginWithGoogle(@Body() body: GoogleSignInDto, @Headers('user-agent') userAgent?: string) {
    return await this.authService.loginWithGoogle(body.data, userAgent);
  }

  @Post('/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar la sesion usando un refresh token opaco' })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiErrorResponse(401, 'Refresh token inválido o expirado')
  async refresh(@Body() body: RefreshDto, @Headers('user-agent') userAgent?: string) {
    this.logger.info(this.context, 'Refreshing authenticated session');
    return await this.authService.refresh(body.refreshToken, userAgent);
  }

  @Post('/logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Cerrar sesion e invalidar los tokens activos del usuario' })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiErrorResponse(401, 'Unauthorized')
  @ApiErrorResponse(404, 'User not found')
  async logout(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Closing session for user ${user.userId}`);
    return await this.authService.logout(user);
  }
}
