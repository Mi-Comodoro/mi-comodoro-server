import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

import { UserRepository } from '../../../users/domain/user.repository';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  const jwtService = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
  const userRepository = { findAuthById: jest.fn() } as unknown as jest.Mocked<UserRepository>;
  let gateway: NotificationsGateway;

  const buildClient = (token?: string) =>
    ({
      id: 'socket-1',
      data: {},
      handshake: { auth: { token }, headers: {} },
      disconnect: jest.fn(),
    }) as unknown as jest.Mocked<Socket>;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new NotificationsGateway(jwtService, userRepository);
  });

  it('rechaza conexiones sin token', async () => {
    const client = buildClient();
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('rechaza tokens con firma inválida', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const client = buildClient('bad');
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('rechaza si el usuario ya no existe', async () => {
    jwtService.verify.mockReturnValue({ userId: 'u1', tokenVersion: 0 });
    userRepository.findAuthById.mockResolvedValue(null);
    const client = buildClient('t');
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('rechaza tokens invalidados (tokenVersion distinto)', async () => {
    jwtService.verify.mockReturnValue({ userId: 'u1', tokenVersion: 1 });
    userRepository.findAuthById.mockResolvedValue({ id: 'u1', tokenVersion: 2 } as never);
    const client = buildClient('t');
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('acepta tokens vigentes y registra el socket del usuario', async () => {
    jwtService.verify.mockReturnValue({ userId: 'u1', tokenVersion: 2 });
    userRepository.findAuthById.mockResolvedValue({ id: 'u1', tokenVersion: 2 } as never);
    const client = buildClient('t');
    await gateway.handleConnection(client);
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data.userId).toBe('u1');
  });

  it('soporta varios sockets por usuario y limpia al desconectar', async () => {
    jwtService.verify.mockReturnValue({ userId: 'u1', tokenVersion: 0 });
    userRepository.findAuthById.mockResolvedValue({ id: 'u1', tokenVersion: 0 } as never);
    const a = buildClient('t');
    const b = { ...buildClient('t'), id: 'socket-2' } as unknown as jest.Mocked<Socket>;
    await gateway.handleConnection(a);
    await gateway.handleConnection(b);

    const emit = jest.fn();
    gateway.server = { to: jest.fn().mockReturnValue({ emit }) } as never;
    gateway.sendToUser('u1', 'evt', { ok: true });
    expect(emit).toHaveBeenCalledTimes(2);

    gateway.handleDisconnect(a);
    gateway.handleDisconnect(b);
    emit.mockClear();
    gateway.sendToUser('u1', 'evt', {});
    expect(emit).not.toHaveBeenCalled();
  });
});
