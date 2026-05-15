import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { UserProfileEntity } from '@/modules/api/modules/user-profile/infrastructure/database/entities/user-profile.entity';
import { UserEntity } from '@/modules/api/modules/users/infrastructure/database/user.entity';

import type { PaginationDto, UpdateUserAdminDto } from '../infrastructure/dto/admin.dto';

@Injectable()
export class AdminUsersService {
  private readonly context: string = AdminUsersService.name;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepo: Repository<UserProfileEntity>,
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
}
