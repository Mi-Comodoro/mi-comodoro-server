import { createHash } from 'node:crypto';

import { JwtService } from '@nestjs/jwt';

import type { JwtPayload } from './jwt/jwt.payload';

type ThrottleRequest = {
  ip?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: { email?: unknown; refreshToken?: unknown };
  socket?: { remoteAddress?: string };
};

let jwtService: JwtService | undefined;

const verifyUserId = (token: string): string | null => {
  try {
    jwtService ??= new JwtService({ secret: process.env.JWT_SECRET });
    const payload = jwtService.verify<JwtPayload>(token);
    return typeof payload.userId === 'string' && payload.userId ? payload.userId : null;
  } catch {
    // Token inválido o vencido: la petición se cuenta por IP y el guard JWT la rechazará después
    return null;
  }
};

const ipOf = (req: ThrottleRequest): string =>
  `ip:${req.ip ?? req.socket?.remoteAddress ?? 'unknown'}`;

// Altas de cuenta: no hay usuario ni correo conocido, así que se limitan por IP
const IP_KEYED_PATHS = [/\/auth\/signup$/, /\/auth\/google$/];

/**
 * Clave con la que se cuenta cada petición para el límite de tasa.
 *
 * El frontend (BFF de Nuxt) llama a este servidor en nombre de todos los usuarios, así que
 * contar solo por IP metía a todos en el mismo cupo. Ahora:
 * - petición autenticada con un JWT válido → por usuario;
 * - inicio de sesión → por correo (protege cada cuenta contra fuerza bruta sin bloquear a los demás);
 * - renovación de sesión → por sesión (hash del refresh token);
 * - altas de cuenta y el resto → por IP (`req.ip`, ver TRUST_PROXY en setup-app).
 * El token se verifica (firma y vigencia): no se puede esquivar el límite con un JWT inventado.
 */
export const resolveThrottleTracker = (req: ThrottleRequest): string => {
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
  if (IP_KEYED_PATHS.some((pattern) => pattern.test(path))) return ipOf(req);

  const authorization = req.headers?.authorization;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (header?.startsWith('Bearer ')) {
    const userId = verifyUserId(header.slice('Bearer '.length));
    if (userId) return `user:${userId}`;
  }

  const email = req.body?.email;
  if (path.endsWith('/auth/signin') && typeof email === 'string' && email.trim()) {
    return `email:${email.trim().toLowerCase().slice(0, 254)}`;
  }

  const refreshToken = req.body?.refreshToken;
  if (path.endsWith('/auth/refresh') && typeof refreshToken === 'string' && refreshToken) {
    return `session:${createHash('sha256').update(refreshToken).digest('hex').slice(0, 32)}`;
  }

  return ipOf(req);
};
