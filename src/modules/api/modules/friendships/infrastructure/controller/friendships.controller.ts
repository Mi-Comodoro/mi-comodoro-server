import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '@/common/decorator/api-error.response';
import { CurrentUser } from '@/common/decorator/current-user.request';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { LoggerProviderService } from '@/core/providers';

import { FriendshipsService } from '../../application/services/friendships.service';
import { SendFriendRequestDto } from '../dto/friendship.dto';

@ApiTags('friendships')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'))
@Controller('friendships')
export class FriendshipsController {
  private readonly context = FriendshipsController.name;

  constructor(
    private readonly friendshipsService: FriendshipsService,
    private readonly logger: LoggerProviderService,
  ) {}

  @Post('/request')
  @ApiOperation({ summary: 'Enviar solicitud de amistad por handle' })
  @ApiOkResponse({ description: 'Solicitud enviada' })
  @ApiErrorResponse(404, 'Usuario no encontrado')
  @ApiErrorResponse(409, 'Solicitud o amistad ya existente')
  async sendRequest(@CurrentUser() user: JwtPayload, @Body() dto: SendFriendRequestDto) {
    this.logger.info(this.context, `Sending friend request from user ${user.userId}`);
    return await this.friendshipsService.sendRequest(user.userId, dto.handle);
  }

  @Post('/:requesterId/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Aceptar solicitud de amistad' })
  @ApiParam({ name: 'requesterId', description: 'ID del usuario que envió la solicitud' })
  @ApiOkResponse({ description: 'Solicitud aceptada' })
  @ApiErrorResponse(404, 'Solicitud no encontrada')
  async acceptRequest(@CurrentUser() user: JwtPayload, @Param('requesterId') requesterId: string) {
    this.logger.info(this.context, `User ${user.userId} accepting request from ${requesterId}`);
    return await this.friendshipsService.acceptRequest(user.userId, requesterId);
  }

  @Post('/:requesterId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechazar solicitud de amistad' })
  @ApiParam({ name: 'requesterId', description: 'ID del usuario que envió la solicitud' })
  @ApiOkResponse({ description: 'Solicitud rechazada' })
  @ApiErrorResponse(404, 'Solicitud no encontrada')
  async rejectRequest(@CurrentUser() user: JwtPayload, @Param('requesterId') requesterId: string) {
    this.logger.info(this.context, `User ${user.userId} rejecting request from ${requesterId}`);
    return await this.friendshipsService.rejectRequest(user.userId, requesterId);
  }

  @Post('/:targetId/block')
  @HttpCode(200)
  @ApiOperation({ summary: 'Bloquear a un usuario' })
  @ApiParam({ name: 'targetId', description: 'ID del usuario a bloquear' })
  @ApiOkResponse({ description: 'Usuario bloqueado' })
  @ApiErrorResponse(404, 'Usuario no encontrado')
  async blockUser(@CurrentUser() user: JwtPayload, @Param('targetId') targetId: string) {
    this.logger.info(this.context, `User ${user.userId} blocking user ${targetId}`);
    return await this.friendshipsService.blockUser(user.userId, targetId);
  }

  @Delete('/:friendId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar un amigo' })
  @ApiParam({ name: 'friendId', description: 'ID del amigo a eliminar' })
  @ApiOkResponse({ description: 'Amistad eliminada' })
  @ApiErrorResponse(404, 'Amistad no encontrada')
  async removeFriend(@CurrentUser() user: JwtPayload, @Param('friendId') friendId: string) {
    this.logger.info(this.context, `User ${user.userId} removing friend ${friendId}`);
    return await this.friendshipsService.removeFriend(user.userId, friendId);
  }

  @Get('/')
  @ApiOperation({ summary: 'Obtener lista de amigos' })
  @ApiOkResponse({ description: 'Lista de amigos' })
  async getFriends(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Fetching friends for user ${user.userId}`);
    return await this.friendshipsService.getFriends(user.userId);
  }

  @Get('/requests/received')
  @ApiOperation({ summary: 'Obtener solicitudes de amistad recibidas' })
  @ApiOkResponse({ description: 'Solicitudes recibidas' })
  async getReceivedRequests(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Fetching received requests for user ${user.userId}`);
    return await this.friendshipsService.getReceivedRequests(user.userId);
  }

  @Get('/requests/sent')
  @ApiOperation({ summary: 'Obtener solicitudes de amistad enviadas' })
  @ApiOkResponse({ description: 'Solicitudes enviadas' })
  async getSentRequests(@CurrentUser() user: JwtPayload) {
    this.logger.info(this.context, `Fetching sent requests for user ${user.userId}`);
    return await this.friendshipsService.getSentRequests(user.userId);
  }
}
