import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { BillsEntity } from '../../database/bills.entity';
import { BillsRepositoryImpl } from '../bills.repository.impl';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const makeBillEntity = (overrides = {}) => {
  const entity = new BillsEntity();
  Object.assign(entity, {
    id: 'bill-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    name: 'Internet',
    expectedAmount: '500',
    billingDay: 15,
    frequency: 'monthly',
    isActive: true,
    isPaid: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });
  return entity;
};

describe('BillsRepositoryImpl', () => {
  let repository: BillsRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsRepositoryImpl,
        { provide: getRepositoryToken(BillsEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<BillsRepositoryImpl>(BillsRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findAllByUser', () => {
    it('returns all bills for user', async () => {
      mockRepo.find.mockResolvedValue([makeBillEntity(), makeBillEntity({ id: 'bill-2' })]);
      const result = await repository.findAllByUser('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findActiveByUser', () => {
    it('returns only active bills', async () => {
      mockRepo.find.mockResolvedValue([makeBillEntity({ isActive: true })]);
      const result = await repository.findActiveByUser('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns bill when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeBillEntity());
      const result = await repository.findById('bill-1', 'user-1');
      expect(result).toMatchObject({ id: 'bill-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('findManyByIds', () => {
    it('returns multiple bills by ids', async () => {
      mockRepo.find.mockResolvedValue([makeBillEntity(), makeBillEntity({ id: 'bill-2' })]);
      const result = await repository.findManyByIds(['bill-1', 'bill-2'], 'user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('saves and returns domain bill', async () => {
      mockRepo.save.mockResolvedValue(makeBillEntity());
      const result = await repository.create({
        userId: 'user-1',
        categoryId: 'cat-1',
        name: 'Internet',
        expectedAmount: 500,
        billingDay: 15,
        frequency: 'monthly',
        isActive: true,
        isPaid: false,
      });
      expect(result).toMatchObject({ id: 'bill-1', name: 'Internet' });
    });
  });

  describe('update', () => {
    it('updates existing bill and returns updated domain', async () => {
      const entity = makeBillEntity();
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.save.mockResolvedValue({ ...entity, name: 'Netflix' });
      const result = await repository.update('bill-1', 'user-1', { name: 'Netflix' } as never);
      expect(result).toMatchObject({ name: 'Netflix' });
    });

    it('returns null when bill not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.update('unknown', 'user-1', {} as never);
      expect(result).toBeNull();
    });
  });

  describe('toggleActive', () => {
    it('toggles isActive and returns updated bill', async () => {
      const entity = makeBillEntity({ isActive: true });
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.save.mockResolvedValue({ ...entity, isActive: false });
      const result = await repository.toggleActive('bill-1', 'user-1');
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.toggleActive('unknown', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes bill when found', async () => {
      const entity = makeBillEntity();
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);
      await repository.delete('bill-1', 'user-1');
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });

    it('throws NotFoundException when bill not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(repository.delete('unknown', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
