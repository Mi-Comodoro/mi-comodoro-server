import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AccountsReceivableService } from '../../application/accounts-receivable.service';
import { CreateAccountReceivableDto } from '../dto/create-account-receivable.dto';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { UpdateAccountReceivableDto } from '../dto/update-account-receivable.dto';

@ApiTags('Accounts Receivable')
@Controller('accounts-receivable')
export class AccountsReceivableController {
  private readonly context = AccountsReceivableController.name;

  constructor(
    private readonly service: AccountsReceivableService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Listar cuentas por cobrar activas' })
  async findAll(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Listing accounts receivable for user ${user.userId}`);
    return this.service.findAll(user.userId);
  }

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Resumen de cuentas por cobrar' })
  async getSummary(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting AR summary for user ${user.userId}`);
    return this.service.getSummary(user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Detalle de una cuenta por cobrar' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por cobrar' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account receivable not found')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting account receivable ${id}`);
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Registrar nueva cuenta por cobrar' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountReceivableDto) {
    this.logger.info(this.context, `Creating account receivable for user ${user.userId}`);
    return this.service.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar cuenta por cobrar' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por cobrar' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account receivable not found')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAccountReceivableDto,
  ) {
    this.logger.info(this.context, `Updating account receivable ${id}`);
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar cuenta por cobrar (soft delete)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por cobrar' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account receivable not found')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Soft deleting account receivable ${id}`);
    await this.service.softDelete(id, user.userId);
    return { message: 'Cuenta por cobrar eliminada correctamente' };
  }

  @Post(':id/collections')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Registrar cobro parcial o total' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por cobrar' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account receivable not found')
  async registerCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCollectionDto,
  ) {
    this.logger.info(this.context, `Registering collection for AR ${id}`);
    await this.service.registerCollection(id, user.userId, dto);
    return { message: 'Cobro registrado correctamente' };
  }
}
