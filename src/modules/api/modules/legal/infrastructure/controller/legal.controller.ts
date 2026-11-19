import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

import { ConsentService } from '../../application/services/consent.service';
import { AcceptConsentDto } from '../dto/consent.dto';

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('/versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Versión vigente de la política de datos y si la aceptación es obligatoria (público)',
  })
  @ApiOkResponse({ description: '{ policyVersion, consentRequired }' })
  getVersions() {
    return this.consentService.getVersions();
  }

  @Get('/consent')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado de la autorización de la persona autenticada' })
  @ApiOkResponse({ description: 'Versión vigente, última aceptada y si debe aceptar' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async getConsent(@CurrentUser() user: JwtPayload) {
    return await this.consentService.getStatus(user.userId);
  }

  @Post('/consent')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Aceptar la versión vigente de la política (graba la evidencia)' })
  @ApiOkResponse({ description: 'Estado actualizado de la autorización' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'La versión enviada no es la vigente')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async acceptConsent(
    @CurrentUser() user: JwtPayload,
    @Body() body: AcceptConsentDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return await this.consentService.accept(user.userId, body.version, {
      ip: req.ip,
      userAgent,
    });
  }
}
