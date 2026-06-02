import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as admin from 'firebase-admin';

import { AccountType } from '@/common/enums/account-type.enum';
import { usePassword } from '@/common/utils';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { JwtProvider } from '@/core/config/security/jwt/jwt.provider';
import { SystemConfigService } from '@/core/modules/system-config/system-config.service';
import { LoggerProviderService } from '@/core/providers';

import { UserProfile } from '../../user-profile/domain/user-profile.entity';
import { UserProfileRepository } from '../../user-profile/domain/user-profile.repository';
import { User } from '../../users/domain/user.entity';
import { UserRepository } from '../../users/domain/user.repository';
import { UserRole } from '../../users/domain/user-role.enum';
import type { RefreshTokenRepository } from '../domain/refresh-token.repository';
import { CreateUserProfile, LoginUserProfile } from './interface';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService {
  private readonly context: string = AuthService.name;
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('UserProfileRepository') private readonly accountRepository: UserProfileRepository,
    @Inject('RefreshTokenRepository')
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly logger: LoggerProviderService,
    private readonly jwtProvider: JwtProvider,
    private readonly jwtService: JwtService,
    private readonly systemConfigService: SystemConfigService,
  ) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FB_PROJECT_ID,
          clientEmail: process.env.FB_CLIENT_EMAIL,
          privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async signup(data: CreateUserProfile, userAgent?: string | null) {
    this.logger.info(this.context, 'Creando usuario y perfil de usuario');
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    } else {
      const user: User = {
        id: randomUUID(),
        email: data.email,
        password: data.passwordHash,
        provider: 'LOCAL',
        tokenVersion: 0,
        handle: data.handle ?? null,
      };

      const planMap: Record<string, AccountType> = {
        free: AccountType.FREE,
        plus: AccountType.PLUS,
        pro: AccountType.PRO,
        partner: AccountType.PARTNER,
      };
      const accountType = planMap[data.plan?.toLowerCase() ?? ''] ?? AccountType.TRIAL;
      const trialDays = await this.systemConfigService.getNumber('trial_duration_days', 14);
      const trialEndsAt =
        accountType === AccountType.TRIAL
          ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
          : null;

      const userCreated: User = await this.userRepository.save(user);
      const newUserProfile: UserProfile = {
        id: randomUUID(),
        userId: userCreated.id,
        name: data.name,
        displayName: data.displayName ?? '',
        gender: data.gender || 'prefer_not_to_say',
        country: data.country,
        accountType,
        trialEndsAt,
        phone: data.phone,
        isPhoneVerified: false,
        phoneVerifiedAt: null,
        isActive: true,
      };
      const userProfile: UserProfile = await this.accountRepository.save(newUserProfile);
      this.logger.info(this.context, `Registro completado para el usuario ${userCreated.id}`);

      const payload: JwtPayload = {
        userId: userCreated.id,
        email: userCreated.email,
        role: userCreated.role ?? UserRole.USER,
        accountType: userProfile.accountType,
        userProfileId: userProfile.id,
        tokenVersion: userCreated.tokenVersion ?? 0,
      };

      const { token, refreshToken, expiresAt } = await this.generateTokenPair(
        payload,
        accountType,
        userAgent,
      );
      return {
        token,
        refreshToken,
        accountType,
        expiresAt,
        onboarding: 'PENDING',
      };
    }
  }

  async signin(credential: LoginUserProfile, userAgent?: string | null) {
    this.logger.info(this.context, 'Login attempt processed');
    const user = await this.userRepository.findByEmail(credential.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { passwordIsValid, passwordHash } = usePassword();

    let validPassword = await passwordIsValid(user.password, credential.password);
    let needsRehash = false;

    if (!validPassword) {
      const legacyValid = await passwordIsValid(user.password, credential.password.toLowerCase());
      if (legacyValid) {
        validPassword = true;
        needsRehash = true;
      }
    }

    if (!validPassword) {
      throw new UnauthorizedException('Wrong email or password');
    }

    if (needsRehash) {
      const newHash = await passwordHash(credential.password);
      await this.userRepository.updatePassword(user.id!, newHash);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role ?? UserRole.USER,
      accountType: user.userProfile?.accountType,
      userProfileId: user.userProfile?.id ?? '',
      tokenVersion: user.tokenVersion ?? 0,
    };

    return this.generateTokenPair(payload, user.userProfile?.accountType, userAgent);
  }

  async loginWithGoogle(data: { idToken: string; name: string }, userAgent?: string | null) {
    this.logger.info(this.context, 'Google login attempt processed');
    let payload: JwtPayload;
    const response: {
      token: string;
      refreshToken: string;
      accountType: string;
      onboarding: string;
      expiresAt?: number;
    } = {
      token: '',
      refreshToken: '',
      accountType: '',
      onboarding: '',
    };
    const { idToken, name } = data;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = (await this.userRepository.findByEmail(decodedToken.email!)) as User;
    if (!user) {
      this.logger.info(this.context, 'No user found for email, creating new user-profile');
      const userCreated = await this.userRepository.save({
        email: decodedToken.email!,
        password: '',
        provider: 'GOOGLE',
        onboarding: 'PENDING',
        tokenVersion: 0,
      });

      const newUserProfile: UserProfile = {
        userId: userCreated.id as string,
        name: name!,
        displayName: '',
        photo: decodedToken.picture?.split('?')[0],
        gender: 'prefer_not_to_say',
        country: 'CO',
        accountType: AccountType.TRIAL,
        isPhoneVerified: false,
        phoneVerifiedAt: null,
        isActive: true,
      };
      const userProfile: UserProfile = await this.accountRepository.save(newUserProfile);
      response.accountType = userProfile.accountType;
      response.onboarding = userCreated.onboarding!;
      this.logger.info(this.context, `Signup completed for user ${userCreated.id}`);
      payload = {
        userId: userCreated.id,
        email: userCreated.email,
        role: userCreated.role ?? UserRole.USER,
        accountType: userProfile.accountType,
        userProfileId: userProfile.id,
        tokenVersion: userCreated.tokenVersion ?? 0,
      };
    } else {
      payload = {
        userId: user.id,
        email: user.email,
        role: user.role ?? UserRole.USER,
        accountType: user.userProfile?.accountType,
        userProfileId: user.userProfile?.id ?? '',
        tokenVersion: user.tokenVersion ?? 0,
      };
      response.accountType = user.userProfile?.accountType as string;
      response.onboarding = user.onboarding as string;
    }

    const { token, refreshToken, expiresAt } = await this.generateTokenPair(
      payload,
      undefined,
      userAgent,
    );

    response.token = token;
    response.refreshToken = refreshToken;
    response.expiresAt = expiresAt;
    return response;
  }

  async refresh(rawRefreshToken: string, userAgent?: string | null) {
    this.logger.info(this.context, 'Refreshing session via refresh token');

    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    await this.refreshTokenRepository.revokeById(stored.id);

    const user = await this.userRepository.findAuthById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (stored.userId !== user.id) {
      throw new UnauthorizedException('Token mismatch');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role ?? UserRole.USER,
      accountType: user.userProfile?.accountType,
      userProfileId: user.userProfile?.id ?? '',
      tokenVersion: user.tokenVersion ?? 0,
    };

    return this.generateTokenPair(payload, user.userProfile?.accountType, userAgent);
  }

  async logout(payload: JwtPayload) {
    this.logger.info(this.context, `Logout requested for user ${payload.userId}`);
    const user = await this.userRepository.findAuthById(payload.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.invalidateTokens(user.id, user.tokenVersion ?? 0);
    await this.refreshTokenRepository.revokeAllForUser(user.id!);

    return {
      message: 'Logout successful',
    };
  }

  private async generateTokenPair(
    payload: JwtPayload,
    accountType?: string,
    userAgent?: string | null,
  ) {
    const token = this.jwtProvider.generateToken(payload);
    const decoded = this.jwtService.decode(token) as { exp: number };

    const rawRefreshToken = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');

    await this.refreshTokenRepository.save({
      userId: payload.userId!,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: userAgent ?? null,
    });

    return {
      token,
      refreshToken: rawRefreshToken,
      accountType,
      expiresAt: decoded.exp,
    };
  }
}
