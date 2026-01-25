import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { usePassword } from '@/common/utils';
import { LoggerProviderService } from '@/core/providers';

import { AuthService } from '../../application/auth.service';
import { SignInDto, SignInResponseDto, SignUpDto, SignUpResponseDto } from '../dto/';

@Controller('auth')
export class AuthController {
  private readonly context: string = AuthController.name;
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Post('/signup')
  @ApiCreatedResponse({ type: SignUpResponseDto })
  @ApiErrorResponse(400, 'Invalid request data')
  @ApiErrorResponse(409, 'User already exists')
  async signup(@Body() body: SignUpDto) {
    this.logger.info(this.context, 'creating user account');
    const { passwordHash, passwordLowerCase } = usePassword();
    const password = body.password;
    const lowerPassword = passwordLowerCase(password);
    const hash = await passwordHash(lowerPassword);

    const data = {
      email: body.email,
      name: body.name,
      displayName: body.displayName,
      gender: body.gender,
      country: body.country,
      usageType: body.usageType,
      financialProfile: body.financialProfile,
      passwordHash: hash,
    };
    return await this.authService.signup(data);
  }

  @Post('/signin')
  @HttpCode(200)
  @ApiOkResponse({ type: SignInResponseDto })
  @ApiErrorResponse(400, 'Invalid request data')
  @ApiErrorResponse(404, 'User not found')
  async signin(@Body() body: SignInDto) {
    this.logger.info(this.context, 'Logging into the user account');
    const { passwordLowerCase } = usePassword();
    const password = body.password;
    const lowerPassword = passwordLowerCase(password);

    const data = {
      ...body,
      password: lowerPassword,
    };
    return await this.authService.signin(data);
  }
}
