import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, string>();

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

      this.userSockets.set(payload.userId, client.id);
      this.logger.log(`Usuario conectado: ${payload.userId} → socket ${client.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Conexión rechazada (token inválido) socket=${client.id} — ${msg}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`Usuario desconectado: ${userId}`);
        break;
      }
    }
  }

  sendToUser(userId: string, event: string, payload: unknown) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    }
  }
}
