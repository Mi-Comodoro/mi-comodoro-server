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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { AccountsPayableService } from '../../application/accounts-payable.service';
import { CreateAccountPayableDto } from '../dto/create-account-payable.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdateAccountPayableDto } from '../dto/update-account-payable.dto';

@ApiTags('Accounts Payable')
@Controller('accounts-payable')
export class AccountsPayableController {
  private readonly context = AccountsPayableController.name;

  constructor(
    private readonly service: AccountsPayableService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Listar cuentas por pagar activas' })
  @ApiOkResponse({ description: 'Lista de cuentas por pagar del usuario' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async findAll(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'Listing accounts payable');
    return this.service.findAll(user.userId);
  }

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Resumen de deuda total' })
  @ApiOkResponse({ description: 'Resumen con totalDebt, monthlyCommitments, debtToIncomeRatio' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async getSummary(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, 'Getting accounts payable summary');
    return this.service.getSummary(user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Detalle de una cuenta por pagar' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por pagar' })
  @ApiOkResponse({ description: 'Detalle de la cuenta por pagar' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account payable not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting account payable: ${id}`);
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Registrar nueva deuda' })
  @ApiOkResponse({ description: 'Cuenta por pagar creada exitosamente' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid data')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountPayableDto) {
    this.logger.info(this.context, 'Creating account payable');
    return this.service.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar cuenta por pagar' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por pagar' })
  @ApiOkResponse({ description: 'Cuenta por pagar actualizada exitosamente' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account payable not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAccountPayableDto,
  ) {
    this.logger.info(this.context, `Updating account payable: ${id}`);
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Eliminar cuenta por pagar (soft delete)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por pagar' })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Cuenta por pagar eliminada exitosamente' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account payable not found')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Removing account payable: ${id}`);
    await this.service.softDelete(id, user.userId);
    return { message: 'Account payable deleted successfully' };
  }

  @Post(':id/payments')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Registrar pago de una deuda' })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la cuenta por pagar' })
  @ApiOkResponse({ description: 'Pago registrado exitosamente' })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Account payable not found')
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid payment data')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Unauthorized')
  async registerPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
  ) {
    this.logger.info(this.context, `Registering payment for account payable: ${id}`);
    return this.service.registerPayment(id, user.userId, dto);
  }
}
