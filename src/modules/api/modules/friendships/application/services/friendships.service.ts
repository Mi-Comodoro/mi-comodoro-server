import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { LoggerProviderService } from '@/core/providers';

import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { NotificationType } from '../../../notifications/domain/enums/notification-type.enum';
import { NotificationsGateway } from '../../../notifications/infrastructure/gateway/notifications.gateway';
import { UserRepository } from '../../../users/domain/user.repository';
import { FriendshipStatus } from '../../domain/enums/friendship-status.enum';
import { FriendshipRepository } from '../../domain/repositories/friendship.repository';

@Injectable()
export class FriendshipsService {
  private readonly context = FriendshipsService.name;

  constructor(
    @Inject('FriendshipRepository')
    private readonly friendshipRepository: FriendshipRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerProviderService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async sendRequest(requesterId: string, handle: string) {
    this.logger.info(this.context, `User ${requesterId} sending friend request to @${handle}`);

    const addressee = await this.userRepository.findByHandle(handle);
    if (!addressee) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (addressee.id === requesterId) {
      throw new ConflictException('No puedes enviarte una solicitud a ti mismo');
    }

    const existing = await this.friendshipRepository.findByPair(requesterId, addressee.id);
    const reverse = await this.friendshipRepository.findByPair(addressee.id, requesterId);

    if (existing || reverse) {
      throw new ConflictException('Ya existe una relación de amistad o solicitud pendiente');
    }

    const result = await this.friendshipRepository.save({
      requesterId,
      addresseeId: addressee.id,
      status: FriendshipStatus.PENDING,
    });

    const requester = await this.userRepository.findById(requesterId);
    const notification = await this.notificationsService.createNotification(
      addressee.id,
      NotificationType.FRIEND_REQUEST,
      {
        senderId: requesterId,
        senderHandle: requester?.handle ?? undefined,
        senderDisplayName: requester?.userProfile?.displayName ?? undefined,
      },
    );
    this.notificationsGateway.sendToUser(addressee.id, 'notification', notification);

    return result;
  }

  async acceptRequest(addresseeId: string, requesterId: string) {
    this.logger.info(this.context, `User ${addresseeId} accepting request from ${requesterId}`);

    const friendship = await this.friendshipRepository.findByPair(requesterId, addresseeId);
    if (!friendship || friendship.status !== FriendshipStatus.PENDING) {
      throw new NotFoundException('Solicitud de amistad no encontrada');
    }
    if (friendship.addresseeId !== addresseeId) {
      throw new ForbiddenException('No tienes permiso para aceptar esta solicitud');
    }

    await this.friendshipRepository.updateStatus(friendship.id, FriendshipStatus.ACCEPTED);

    const accepter = await this.userRepository.findById(addresseeId);
    const notification = await this.notificationsService.createNotification(
      requesterId,
      NotificationType.FRIEND_ACCEPTED,
      {
        senderId: addresseeId,
        senderHandle: accepter?.handle ?? undefined,
        senderDisplayName: accepter?.userProfile?.displayName ?? undefined,
      },
    );
    this.notificationsGateway.sendToUser(requesterId, 'notification', notification);

    return { success: true };
  }

  async rejectRequest(addresseeId: string, requesterId: string) {
    this.logger.info(this.context, `User ${addresseeId} rejecting request from ${requesterId}`);

    const friendship = await this.friendshipRepository.findByPair(requesterId, addresseeId);
    if (!friendship || friendship.status !== FriendshipStatus.PENDING) {
      throw new NotFoundException('Solicitud de amistad no encontrada');
    }
    if (friendship.addresseeId !== addresseeId) {
      throw new ForbiddenException('No tienes permiso para rechazar esta solicitud');
    }

    await this.friendshipRepository.delete(friendship.id);

    const rejecter = await this.userRepository.findById(addresseeId);
    const notification = await this.notificationsService.createNotification(
      requesterId,
      NotificationType.FRIEND_REJECTED,
      {
        senderId: addresseeId,
        senderHandle: rejecter?.handle ?? undefined,
        senderDisplayName: rejecter?.userProfile?.displayName ?? undefined,
      },
    );
    this.notificationsGateway.sendToUser(requesterId, 'notification', notification);

    return { success: true };
  }

  async blockUser(requesterId: string, targetId: string) {
    this.logger.info(this.context, `User ${requesterId} blocking user ${targetId}`);

    const existing = await this.friendshipRepository.findByPair(requesterId, targetId);
    const reverse = await this.friendshipRepository.findByPair(targetId, requesterId);

    if (existing) {
      await this.friendshipRepository.updateStatus(existing.id, FriendshipStatus.BLOCKED);
    } else if (reverse) {
      await this.friendshipRepository.updateStatus(reverse.id, FriendshipStatus.BLOCKED);
    } else {
      await this.friendshipRepository.save({
        requesterId,
        addresseeId: targetId,
        status: FriendshipStatus.BLOCKED,
      });
    }

    return { success: true };
  }

  async removeFriend(userId: string, friendId: string) {
    this.logger.info(this.context, `User ${userId} removing friend ${friendId}`);

    const friendship =
      (await this.friendshipRepository.findByPair(userId, friendId)) ??
      (await this.friendshipRepository.findByPair(friendId, userId));

    if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new NotFoundException('Amistad no encontrada');
    }

    await this.friendshipRepository.delete(friendship.id);
    return { success: true };
  }

  async getFriends(userId: string) {
    this.logger.info(this.context, `Fetching friends for user ${userId}`);
    return await this.friendshipRepository.findAcceptedByUserIdWithProfiles(userId);
  }

  async getReceivedRequests(userId: string) {
    this.logger.info(this.context, `Fetching received requests for user ${userId}`);
    return await this.friendshipRepository.findReceivedPending(userId);
  }

  async getSentRequests(userId: string) {
    this.logger.info(this.context, `Fetching sent requests for user ${userId}`);
    return await this.friendshipRepository.findSentPending(userId);
  }
}
