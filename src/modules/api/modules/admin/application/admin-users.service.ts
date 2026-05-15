import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { subDays } from 'date-fns';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { BudgetEntity } from '@/modules/api/modules/budgets/infrastructure/database/entities/budget.entity';
import { TransactionEntity } from '@/modules/api/modules/transactions/infrastructure/database/entities/transaction.entity';
import { UserProfileEntity } from '@/modules/api/modules/user-profile/infrastructure/database/entities/user-profile.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import type {
  AdminStatsDto,
  PaginationDto,
  UpdateUserAdminDto,
} from '../infrastructure/dto/admin.dto';

@Injectable()
export class AdminUsersService {
  private readonly context: string = AdminUsersService.name;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepo: Repository<UserProfileEntity>,
    @InjectRepository(BudgetEntity)
    private readonly budgetRepo: Repository<BudgetEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    private readonly logger: LoggerProviderService,
  ) {}

  async findAll(dto: PaginationDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    this.logger.info(this.context, `Listing users — page ${page}, limit ${limit}`);
    const [data, total] = await this.userRepo.findAndCount({
      where: { nulledAt: IsNull() },
      relations: { userProfile: true },
      select: {
        id: true,
        email: true,
        role: true,
        onboarding: true,
        createdAt: true,
        userProfile: { isActive: true },
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findById(id: string) {
    this.logger.info(this.context, `Getting user ${id}`);
    const user = await this.userRepo.findOne({
      where: { id, nulledAt: IsNull() },
      relations: { userProfile: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, dto: UpdateUserAdminDto) {
    this.logger.info(this.context, `Updating user ${id}`);
    const user = await this.userRepo.findOne({
      where: { id, nulledAt: IsNull() },
      relations: { userProfile: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.role !== undefined) {
      await this.userRepo.update(id, { role: dto.role });
    }

    if (dto.isActive !== undefined && user.userProfile) {
      await this.profileRepo.update(user.userProfile.id, { isActive: dto.isActive });
    }

    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    this.logger.info(this.context, `Soft deleting user ${id}`);
    const user = await this.userRepo.findOne({ where: { id, nulledAt: IsNull() } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.userRepo.update(id, { nulledAt: new Date() });
  }

  async getStats(): Promise<AdminStatsDto> {
    this.logger.info(this.context, 'Getting admin stats');
    const now = new Date();
    const [
      totalUsers,
      activeUsers,
      totalBudgets,
      totalTransactions,
      newUsersLast30Days,
      newUsersLast7Days,
    ] = await Promise.all([
      this.userRepo.count({ where: { nulledAt: IsNull() } }),
      this.userRepo
        .createQueryBuilder('u')
        .innerJoin('budgets', 'b', 'b."ownerId" = u.id AND b.nulled_at IS NULL')
        .where('u.nulled_at IS NULL')
        .getCount(),
      this.budgetRepo.count(),
      this.transactionRepo.count({ where: { nulledAt: IsNull() } }),
      this.userRepo.count({ where: { nulledAt: IsNull(), createdAt: MoreThan(subDays(now, 30)) } }),
      this.userRepo.count({ where: { nulledAt: IsNull(), createdAt: MoreThan(subDays(now, 7)) } }),
    ]);
    return {
      totalUsers,
      activeUsers,
      totalBudgets,
      totalTransactions,
      newUsersLast30Days,
      newUsersLast7Days,
    };
  }
}
