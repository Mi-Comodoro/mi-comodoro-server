import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AccountEntity } from '../../database/account.entity';
import { AccountRepositoryImpl } from '../account.repository.impl';

const mockRepo = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const makeAccountEntity = (overrides = {}) => ({
  id: 'acc-1',
  userId: 'user-1',
  name: 'Cuenta Principal',
  isPrimary: true,
  isActive: true,
  interestRate: '0',
  description: '',
  compoundingFrequency: null,
  type: 'savings',
  nulledAt: null,
  ...overrides,
});

describe('AccountRepositoryImpl', () => {
  let repository: AccountRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRepositoryImpl,
        { provide: getRepositoryToken(AccountEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<AccountRepositoryImpl>(AccountRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('saves account and returns domain object', async () => {
      mockRepo.save.mockResolvedValue(makeAccountEntity());
      const result = await repository.add({ userId: 'user-1', name: 'Cuenta Principal' } as never);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'acc-1' });
    });
  });

  describe('get', () => {
    it('returns all accounts for user', async () => {
      mockRepo.find.mockResolvedValue([makeAccountEntity(), makeAccountEntity({ id: 'acc-2' })]);
      const result = await repository.get('user-1');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no accounts', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.get('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('findPrimaryByUserId', () => {
    it('returns primary account when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccountEntity({ isPrimary: true }));
      const result = await repository.findPrimaryByUserId('user-1');
      expect(result).not.toBeNull();
    });

    it('returns null when no primary account', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findPrimaryByUserId('user-1');
      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUser', () => {
    it('returns account when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccountEntity());
      const result = await repository.findByIdAndUser('acc-1', 'user-1');
      expect(result).toMatchObject({ id: 'acc-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByIdAndUser('unknown', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates and returns updated account', async () => {
      const existing = makeAccountEntity();
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({ ...existing, name: 'Cuenta Actualizada' });
      const result = await repository.update('acc-1', 'user-1', {
        name: 'Cuenta Actualizada',
      } as never);
      expect(result).toMatchObject({ name: 'Cuenta Actualizada' });
    });

    it('returns null when account not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.update('unknown', 'user-1', {} as never);
      expect(result).toBeNull();
    });
  });
});
