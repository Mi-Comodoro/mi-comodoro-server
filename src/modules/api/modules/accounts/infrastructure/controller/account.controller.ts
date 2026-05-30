import { Body, Controller, Get, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorators/api-error.response';
import { CurrentUser } from '@/common/decorators/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AccountService } from '../../application/services/account.service';
import { CreateAccountDto } from '../dto/account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';

@ApiTags('accounts')
@Controller('account')
export class AccountController {
  private readonly context: string = AccountController.name;
  constructor(
    private readonly logger: LoggerProviderService,
    private readonly accountService: AccountService,
  ) {}
  @Post('/')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Crear una cuenta de ahorro' })
  @ApiCreatedResponse({ description: 'Cuenta creada exitosamente' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid data')
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateAccountDto) {
    this.logger.info(this.context, 'creating savings account reference');
    const data = { ...body, userId: user.userId };
    return await this.accountService.create(data);
  }

  @Get('/')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Listar cuentas de ahorro del usuario' })
  @ApiOkResponse({ description: 'Lista de cuentas de ahorro' })
  async get(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'getting savings account reference');
    return await this.accountService.get(user.userId);
  }

  @Patch(':id')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Actualizar cuenta de ahorro' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la cuenta' })
  @ApiOkResponse({ description: 'Cuenta actualizada exitosamente' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account not found')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid data')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: UpdateAccountDto,
  ) {
    this.logger.info(this.context, `updating savings account ${id}`);
    return await this.accountService.update(id, user.userId, body);
  }

  @Get(':id/rate-history')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Historial de cambios de tasa de interés' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la cuenta' })
  @ApiOkResponse({ description: 'Lista de cambios de tasa ordenados por fecha DESC' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account not found')
  async getRateHistory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.logger.info(this.context, `getting rate history for account ${id}`);
    return await this.accountService.getRateHistory(id, user.userId);
  }
}
