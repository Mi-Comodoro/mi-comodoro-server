import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';

import { BetaAccessService } from '../../application/services/beta-access.service';
import { CreateBetaRequestDto } from '../dto/beta-access.dto';

/** Endpoints públicos de la beta cerrada: pedir acceso y precargar el correo de una invitación. */
@ApiTags('beta-access')
@Controller('beta-access')
export class BetaAccessController {
  constructor(private readonly service: BetaAccessService) {}

  @Post('/requests')
  @HttpCode(HttpStatus.ACCEPTED)
  // Público y sin usuario: se cuenta por IP. Pocos intentos por minuto para frenar el spam de correos.
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Pedir acceso a la beta cerrada (público)' })
  @ApiAcceptedResponse({
    description: '{ received: true }; no revela si el correo ya había pedido',
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Correo inválido o falta la autorización')
  async request(@Body() body: CreateBetaRequestDto) {
    // Campo trampa: un bot lo llena y recibe la misma respuesta, pero no se guarda nada
    if (!body.website) await this.service.request(body.email, body.policyVersion);
    return { received: true };
  }

  @Get('/invitations/:token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Valida una invitación y devuelve el correo para el registro (público)',
  })
  @ApiParam({ name: 'token', type: String })
  @ApiOkResponse({ description: '{ email }' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'La invitación no es válida o ya venció')
  async validateInvitation(@Param('token') token: string) {
    return await this.service.validateInvitation(token);
  }
}
