import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';

import { usePassword } from '@/common/utils';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { JwtProvider } from '@/core/config/security/jwt/jwt.provider';
import { LoggerProviderService } from '@/core/providers';

import { UserProfile } from '../../user-profile/domain/user-profile.entity';
import { UserProfileRepository } from '../../user-profile/domain/user-profile.repository';
import { User } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { UserRepository } from '../../users/domain/user.repository';
import { CreateUserProfile, LoginUserProfile } from './interface';
import { signUpToClient } from './mapper/signup.mapper';

@Injectable()
export class AuthService {
  private readonly context: string = AuthService.name;
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('UserProfileRepository') private readonly accountRepository: UserProfileRepository,
    private readonly logger: LoggerProviderService,
    private readonly jwtProvider: JwtProvider,
    private readonly jwtService: JwtService,
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
  async signup(data: CreateUserProfile) {
    this.logger.info(this.context, 'Creating user user-profile');
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
      };

      const userCreated: User = await this.userRepository.save(user);
      const newUserProfile: UserProfile = {
        id: randomUUID(),
        userId: userCreated.id,
        name: data.name,
        displayName: data.displayName ?? '',
        gender: data.gender || 'prefer_not_to_say',
        country: data.country,
        type: 'trial',
        isActive: true,
      };
      const userProfile: UserProfile = await this.accountRepository.save(newUserProfile);
      this.logger.info(this.context, `Signup completed for user ${userCreated.id}`);
      return signUpToClient(userCreated, userProfile);
    }
  }

  async signin(credential: LoginUserProfile) {
    this.logger.info(this.context, `Login attempt processed for user ${credential.email}`);
    const user = await this.userRepository.findByEmail(credential.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { passwordIsValid } = usePassword();

    const validPassword = await passwordIsValid(user.password, credential.password);

    if (!validPassword) {
      throw new UnauthorizedException('Wrong email or password');
    }
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role ?? UserRole.USER,
      userProfileId: user.userProfile?.id ?? '',
      tokenVersion: user.tokenVersion ?? 0,
    };
    const token = this.jwtProvider.generateToken(payload);
    const decoded = this.jwtService.decode(token) as { exp: number };

    return {
      token,
      accountType: user.userProfile?.type,
      expiresAt: decoded.exp,
    };
  }

  async loginWithGoogle(data: { idToken: string; name: string }) {
    this.logger.info(this.context, `Google login attempt processed for user ${data.name}`);
    let payload: JwtPayload;
    const response: {
      token: string;
      accountType: string;
      onboarding: string;
      expiresAt?: number;
    } = {
      token: '',
      accountType: '',
      onboarding: '',
    };
    const { idToken, name } = data;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = (await this.userRepository.findByEmail(decodedToken.email!)) as User;
    if (!user) {
      this.logger.info(
        this.context,
        `No user found for email ${decodedToken.email}, creating new user-profile`,
      );
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
        type: 'trial',
        isActive: true,
      };
      this.logger.info(
        this.context,
        `UserProfile created for user ${userCreated.id} with email ${decodedToken.email}`,
      );
      const userProfile: UserProfile = await this.accountRepository.save(newUserProfile);
      response.accountType = userProfile.type;
      response.onboarding = userCreated.onboarding!;
      this.logger.info(this.context, `Signup completed for user ${userCreated.id}`);
      payload = {
        userId: userCreated.id,
        email: userCreated.email,
        userProfileId: userProfile.id,
        tokenVersion: userCreated.tokenVersion ?? 0,
      };
    } else {
      payload = {
        userId: user.id,
        email: user.email,
        userProfileId: user.userProfile?.id ?? '',
        tokenVersion: user.tokenVersion ?? 0,
      };
      response.accountType = user.userProfile?.type as string;
      response.onboarding = user.onboarding as string;
    }

    const token = this.jwtProvider.generateToken(payload);
    const decoded = this.jwtService.decode(token) as { exp: number };

    response.token = token;
    response.expiresAt = decoded.exp;
    return response;
  }

  async refresh(payload: JwtPayload) {
    this.logger.info(this.context, 'Refreshing authenticated session');
    const user = await this.userRepository.findAuthById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Session invalidated');
    }

    const newPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      userProfileId: payload.userProfileId,
      tokenVersion: user.tokenVersion,
    };

    const token = this.jwtProvider.generateToken(newPayload);
    const decoded = this.jwtService.decode(token) as { exp: number };

    return {
      token,
      expiresAt: decoded.exp,
    };
  }

  async logout(payload: JwtPayload) {
    this.logger.info(this.context, `Logout requested for user ${payload.userId}`);
    const user = await this.userRepository.findAuthById(payload.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.invalidateTokens(user.id, user.tokenVersion ?? 0);

    return {
      message: 'Logout successful',
    };
  }
}
