import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { AddMemberDto, CreateGroupDto, UpdateGroupDto } from '../dto/groups.dto';
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
  @ApiOperation({ summary: 'Listar grupos del usuario autenticado (owner o miembro)' })
  @ApiOkResponse({ description: 'Lista de grupos' })
  async getGroups(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting groups for user ${user.userId}`);
    return this.groupsService.getGroups(user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener detalle de un grupo con sus miembros' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del grupo' })
  @ApiOkResponse({ description: 'Detalle del grupo' })
  @ApiNotFoundResponse({ description: 'Grupo no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin acceso al grupo' })
  async getGroupById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Getting group ${id}`);
    return this.groupsService.getGroupById(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), GroupRolesGuard)
  @GroupRoles('OWNER')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Editar nombre, tipo o maxMembers del grupo (solo owner)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del grupo' })
  @ApiOkResponse({ description: 'Grupo actualizado' })
  @ApiForbiddenResponse({ description: 'Solo el owner puede editar el grupo' })
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Updating group ${id}`);
    return this.groupsService.updateGroup(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Eliminar grupo (soft delete, solo owner)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del grupo' })
  @ApiOkResponse({ description: 'Grupo eliminado' })
  @ApiForbiddenResponse({ description: 'Solo el owner puede eliminar el grupo' })
  async deleteGroup(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Deleting group ${id}`);
    return this.groupsService.deleteGroup(id, user.userId);
  }

  @Post(':id/members')
  @UseGuards(AuthGuard('jwt'), GroupRolesGuard)
  @GroupRoles('OWNER', 'EDITOR')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Invitar un miembro al grupo (solo owner)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del grupo' })
  @ApiOkResponse({ description: 'Miembro agregado' })
  @ApiForbiddenResponse({ description: 'Solo el owner puede invitar miembros' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Adding member to group ${id}`);
    return this.groupsService.addMember(id, user.userId, dto);
  }

  @Delete(':id/members/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Remover miembro del grupo (owner o el propio usuario)' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del grupo' })
  @ApiParam({ name: 'userId', type: String, description: 'UUID del usuario a remover' })
  @ApiOkResponse({ description: 'Miembro removido' })
  @ApiForbiddenResponse({ description: 'Sin permisos para remover este miembro' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.info(this.context, `Removing member ${targetUserId} from group ${id}`);
    return this.groupsService.removeMember(id, targetUserId, user.userId);
  }
}
