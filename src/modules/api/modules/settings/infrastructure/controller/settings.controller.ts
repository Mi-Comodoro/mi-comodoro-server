import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { SettingsService } from '../../application/services/settings.service';
import {
  SettingsResponseDto,
  UpdateBudgetDefaultsDto,
  UpdateSettingsDto,
} from '../dto/settings.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  private readonly context: string = SettingsController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener configuración del usuario autenticado (auto-crea si no existe)',
  })
  @ApiOkResponse({ type: SettingsResponseDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async getSettings(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting settings for user ${user.userId}`);
    return await this.settingsService.getSettings(user.userId);
  }

  @Patch('/')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar configuración general (currency, language, notificationsEnabled)',
  })
  @ApiOkResponse({ type: SettingsResponseDto })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Settings not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    this.logger.info(this.context, `Updating settings for user ${user.userId}`);
    return await this.settingsService.updateSettings(user.userId, dto);
  }

  @Patch('/budget-defaults')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar valores predeterminados de presupuesto' })
  @ApiOkResponse({ type: SettingsResponseDto })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Settings not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async updateBudgetDefaults(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBudgetDefaultsDto,
  ) {
    this.logger.info(this.context, `Updating budget defaults for user ${user.userId}`);
    return await this.settingsService.updateBudgetDefaults(user.userId, dto);
  }
}
