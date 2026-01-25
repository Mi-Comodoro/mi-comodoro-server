import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { usePassword } from '@/common/utils';
import { JwtPayload } from '@/core/config/security/jwt/jwt.payload';
import { JwtProvider } from '@/core/config/security/jwt/jwt.provider';
import { LoggerProviderService } from '@/core/providers';

import { Account } from '../../account/domain/account.entity';
import { AccountRepository } from '../../account/domain/account.repository';
import { User } from '../../users/domain/user.entity';
import { UserRepository } from '../../users/domain/user.repository';
import { CreateUserAccount, LoginUserAccount } from './interface';
import { signUpToClient } from './mapper/signup.mapper';

@Injectable()
export class AuthService {
  private readonly context: string = AuthService.name;
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('AccountRepository') private readonly accountRepository: AccountRepository,
    private readonly logger: LoggerProviderService,
    private readonly jwtProvider: JwtProvider,
  ) {}
  async signup(data: CreateUserAccount) {
    this.logger.info(this.context, 'Creating user account');
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    } else {
      const user: User = {
        id: randomUUID(),
        email: data.email,
        password: data.passwordHash,
        isActive: true,
      };

      const userCreated: User = await this.userRepository.save(user);
      const newAccount: Account = {
        id: randomUUID(),
        userId: userCreated.id,
        name: data.name,
        displayName: data.displayName ?? '',
        gender: data.gender || 'PREFER_NOT_TO_SAY',
        country: data.country,
        usageType: data.usageType,
        financialProfile: data.financialProfile,
        type: 'TRIAL',
        isActive: true,
      };
      const userAccount: Account = await this.accountRepository.save(newAccount);
      this.logger.info(this.context, `Signup completed for user ${userCreated.id}`);
      return signUpToClient(userCreated, userAccount);
    }
  }

  async signin(credential: LoginUserAccount) {
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
      accountId: user.account?.id ?? '',
    };

    return {
      token: this.jwtProvider.generateToken(payload),
      active: user.isActive,
      accountType: user.account?.type,
    };
  }
}
