import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Bill } from '../../domain/bills';
import { BillsRepository } from '../../domain/repositories/bills.repository';
import { BillsEntity } from '../database/bills.entity';
import { BillMapper } from '../mapper/bill.mapper';

@Injectable()
export class BillsRepositoryImpl implements BillsRepository {
  constructor(
    @InjectRepository(BillsEntity)
    private readonly repo: Repository<BillsEntity>,
  ) {}

  async findAllByUser(userId: string): Promise<Bill[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(BillMapper.toDomain);
  }

  async findActiveByUser(userId: string): Promise<Bill[]> {
    const entities = await this.repo.find({
      where: { userId, isActive: true },
      order: { name: 'ASC' },
    });
    return entities.map(BillMapper.toDomain);
  }

  async findById(id: string, userId: string): Promise<Bill | null> {
    const entity = await this.repo.findOne({ where: { id, userId } });
    return entity ? BillMapper.toDomain(entity) : null;
  }

  async findManyByIds(ids: string[], userId: string): Promise<Bill[]> {
    const entities = await this.repo.find({ where: { id: In(ids), userId } });
    return entities.map(BillMapper.toDomain);
  }

  async create(data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bill> {
    const entity = BillMapper.toEntity(data);
    const saved = await this.repo.save(entity);
    return BillMapper.toDomain(saved);
  }

  async update(id: string, userId: string, data: Partial<Bill>): Promise<Bill | null> {
    const entity = await this.repo.findOne({ where: { id, userId } });
    if (!entity) return null;
    Object.assign(entity, BillMapper.toEntity(data));
    const saved = await this.repo.save(entity);
    return BillMapper.toDomain(saved);
  }

  async toggleActive(id: string, userId: string): Promise<Bill | null> {
    const entity = await this.repo.findOne({ where: { id, userId } });
    if (!entity) return null;
    entity.isActive = !entity.isActive;
    const saved = await this.repo.save(entity);
    return BillMapper.toDomain(saved);
  }

  async delete(id: string, userId: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Factura no encontrada');
    await this.repo.remove(entity);
  }
}
