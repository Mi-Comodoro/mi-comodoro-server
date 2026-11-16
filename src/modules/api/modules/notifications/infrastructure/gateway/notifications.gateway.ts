import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { corsOriginResolver } from '@/core/config/security/allowed-origins';

@WebSocketGateway({
  cors: {
    origin: corsOriginResolver,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const origin = client.handshake.headers?.origin ?? 'sin-origin';
    this.logger.log(`handleConnection disparado socket=${client.id} origin=${origin}`);
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) {
        this.logger.warn(`Conexión rechazada (sin token) socket=${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ userId: string }>(token, {
        secret: process.env.JWT_SECRET,
      });

      const sockets = this.userSockets.get(payload.userId) ?? new Set<string>();
      sockets.add(client.id);
      this.userSockets.set(payload.userId, sockets);
      client.data.userId = payload.userId;
      this.logger.log(`Usuario conectado: ${payload.userId} → socket ${client.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Conexión rechazada (token inválido) socket=${client.id} — ${msg}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    sockets?.delete(client.id);
    if (sockets && sockets.size === 0) {
      this.userSockets.delete(userId);
    }
    this.logger.log(`Usuario desconectado: ${userId}`);
  }

  sendToUser(userId: string, event: string, payload: unknown) {
    const sockets = this.userSockets.get(userId);
    sockets?.forEach((socketId) => this.server.to(socketId).emit(event, payload));
  }
}
