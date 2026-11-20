import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

import { AccountDeletionService } from '../../application/services/account-deletion.service';
import { DataExportService } from '../../application/services/data-export.service';
import { RequestDeletionDto } from '../dto/privacy.dto';

@ApiTags('privacy')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('privacy')
export class PrivacyController {
  constructor(
    private readonly exportService: DataExportService,
    private readonly deletionService: AccountDeletionService,
  ) {}

  @Get('/export')
  @Throttle({ short: { ttl: 60_000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Derecho de acceso: descargar todos mis datos (JSON)' })
  @ApiOkResponse({ description: 'Todos los datos personales de la persona autenticada' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async exportData(@CurrentUser() user: JwtPayload) {
    return await this.exportService.export(user.userId);
  }

  @Get('/deletion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado de la solicitud de eliminación de cuenta' })
  async getDeletion(@CurrentUser() user: JwtPayload) {
    return await this.deletionService.getStatus(user.userId);
  }

  @Post('/deletion')
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Derecho de supresión: solicitar la eliminación. Los datos viven hasta 90 días antes del borrado permanente',
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'La frase de confirmación no coincide')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Organiza un grupo con otras personas')
  async requestDeletion(@CurrentUser() user: JwtPayload, @Body() body: RequestDeletionDto) {
    return await this.deletionService.requestDeletion(user.userId, body.confirmation);
  }

  @Delete('/deletion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar la solicitud de eliminación (antes del borrado permanente)' })
  async cancelDeletion(@CurrentUser() user: JwtPayload) {
    return await this.deletionService.cancelDeletion(user.userId);
  }
}
