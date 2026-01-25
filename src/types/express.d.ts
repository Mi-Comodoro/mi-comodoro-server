import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
