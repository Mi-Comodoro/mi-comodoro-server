import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import { getErrorMessage } from '@/common/helpers/error.helpers';
import { LoggerProviderService } from '@/core/providers';

import { JwtPayload } from './jwt.payload';

export const WS_TOKEN_TTL: StringValue = '60s';

@Injectable()
export class JwtProvider {
  private readonly context: string = JwtProvider.name;
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: LoggerProviderService,
  ) {}

  generateToken(payload: JwtPayload): string {
    this.logger.info(this.context, 'Generating access token');
    try {
      return this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN as StringValue,
      });
    } catch (error) {
      this.logger.error(this.context, getErrorMessage(error));
      throw new InternalServerErrorException('Error generating access token');
    }
  }

  /**
   * Token de vida corta (60 s) y un solo propósito para el handshake del WebSocket.
   * Evita exponer el access token a JavaScript del navegador. JwtStrategy lo rechaza
   * como token de API (typ = 'ws').
   */
  generateWsToken(payload: Pick<JwtPayload, 'userId' | 'tokenVersion'>): string {
    try {
      return this.jwtService.sign(
        { userId: payload.userId, tokenVersion: payload.tokenVersion ?? 0, typ: 'ws' },
        { secret: process.env.JWT_SECRET, expiresIn: WS_TOKEN_TTL },
      );
    } catch (error) {
      this.logger.error(this.context, getErrorMessage(error));
      throw new InternalServerErrorException('Error generating websocket token');
    }
  }
}
