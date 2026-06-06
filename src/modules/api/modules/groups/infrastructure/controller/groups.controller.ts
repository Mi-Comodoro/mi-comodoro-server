import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.request';
import { GroupRoles } from '@/common/decorators/group-roles.decorator';
import type { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { GroupsService } from '../../application/groups.service';
import { CreateGroupExpenseDto, UpdateGroupExpenseDto } from '../dto/group-expense.dto';
import {
  AddMemberDto,
  CreateGroupDto,
  InviteWithContextDto,
  RespondGroupInvitationDto,
  UpdateGroupDto,
} from '../dto/groups.dto';
import { GroupRolesGuard } from '../guards/group-roles.guard';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  private readonly context: string = GroupsController.name;

  constructor(
    private readonly logger: LoggerProviderService,
    private readonly groupsService: GroupsService,
  ) {}

  @Post('/')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Crear un nuevo grupo' })
  @ApiOkResponse({ description: 'Grupo creado exitosamente' })
  async createGroup(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    this.logger.info(this.context, `Creating group for user ${user.userId}`);
    return this.groupsService.createGroup(user.userId, dto);
  }

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Listar grupos del usuario autenticado' })
  @ApiOkResponse({ description: 'Lista de grupos' })
  async getGroups(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting groups for user ${user.userId}`);
    return this.groupsService.getGroups(user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener detalle de un grupo con sus miembros' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Detalle del grupo' })
  @ApiNotFoundResponse({ description: 'Grupo no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin acceso al grupo' })
  async getGroupById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting group ${id}`);
    return this.groupsService.getGroupById(id, user.userId);
  }

  @Get(':id/contributions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener aportes por miembro del grupo' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Aportes por miembro con % y progreso del objetivo' })
  @ApiNotFoundResponse({ description: 'Grupo no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin acceso al grupo' })
  async getContributions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting contributions for group ${id}`);
    return this.groupsService.getContributions(id, user.userId);
  }

  @Get(':id/budget-progress')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Progreso del presupuesto vinculado al grupo (meta + gastos)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Progreso de la meta del grupo con gastos planificados vinculados',
  })
  @ApiNotFoundResponse({ description: 'Grupo no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin acceso al grupo' })
  async getGroupBudgetProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Getting budget progress for group ${id}`);
    return this.groupsService.getGroupBudgetProgress(id, user.userId);
  }

  @Get(':id/expenses')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Listar gastos del plan del grupo' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Lista de gastos del grupo' })
  @ApiNotFoundResponse({ description: 'Grupo no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin acceso al grupo' })
  async getExpenses(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting expenses for group ${id}`);
    return this.groupsService.getExpenses(id, user.userId);
  }

  @Post(':id/expenses')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Agregar un gasto al plan del grupo (organizadores)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Gasto creado exitosamente' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de organizador' })
  async createExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGroupExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Creating expense for group ${id}`);
    return this.groupsService.createExpense(id, user.userId, dto);
  }

  @Patch(':id/expenses/:expenseId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Editar un gasto planificado del grupo (solo organizadores)' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'expenseId', type: String })
  @ApiOkResponse({ description: 'Gasto actualizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol de organizador' })
  async updateExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: UpdateGroupExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Updating expense ${expenseId} in group ${id}`);
    return this.groupsService.updateExpense(id, expenseId, user.userId, dto);
  }

  @Patch(':id/expenses/:expenseId/pay')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Marcar un gasto como pagado' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'expenseId', type: String })
  @ApiOkResponse({ description: 'Gasto marcado como pagado' })
  @ApiForbiddenResponse({ description: 'Sin permisos para pagar este gasto' })
  async payExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Paying expense ${expenseId} in group ${id}`);
    return this.groupsService.payExpense(id, expenseId, user.userId);
  }

  @Patch(':id/expenses/:expenseId/pending')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Crear cuenta por pagar (CxP) para un gasto' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'expenseId', type: String })
  @ApiOkResponse({ description: 'Gasto marcado como CxP creada' })
  @ApiForbiddenResponse({ description: 'Sin permisos para crear CxP' })
  async markCxp(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Marking expense ${expenseId} as CxP in group ${id}`);
    return this.groupsService.markExpenseCxp(id, expenseId, user.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), GroupRolesGuard)
  @GroupRoles('ORGANIZER')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Editar grupo (solo organizador)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Grupo actualizado' })
  async updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Updating group ${id}`);
    return this.groupsService.updateGroup(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Eliminar grupo (soft delete, solo organizador)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Grupo eliminado' })
  async deleteGroup(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Deleting group ${id}`);
    return this.groupsService.deleteGroup(id, user.userId);
  }

  @Post(':id/members')
  @UseGuards(AuthGuard('jwt'), GroupRolesGuard)
  @GroupRoles('ORGANIZER', 'CO_ORGANIZER')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Invitar miembro al grupo (sin contexto de viaje)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Miembro invitado' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Adding member to group ${id}`);
    return this.groupsService.addMember(id, user.userId, dto);
  }

  @Post(':id/invite-context')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Invitar miembro a un grupo de viaje con contexto (meta + monto planificado)',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Invitación enviada con notificación contextual' })
  @ApiForbiddenResponse({ description: 'Solo el organizador puede invitar' })
  async inviteWithContext(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteWithContextDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Inviting user ${dto.userId} to group ${id} with context`);
    return this.groupsService.inviteWithContext(id, user.userId, dto);
  }

  @Post(':id/respond-invitation')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Responder a una invitación de viaje (aceptar con monto, sin monto, o declinar)',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description:
      'Respuesta registrada; si acepta con monto, se crea gasto planificado en su presupuesto',
  })
  async respondToInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondGroupInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `User ${user.userId} responding to invitation for group ${id}`);
    return this.groupsService.respondToInvitation(id, user.userId, dto);
  }

  @Delete(':id/members/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Remover miembro del grupo' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({ description: 'Miembro removido' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Removing member ${targetUserId} from group ${id}`);
    return this.groupsService.removeMember(id, targetUserId, user.userId);
  }
}
