import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserGroupEntity } from '../../database/entities/user-group.entity';
import { UserGroupRepositoryImpl } from '../user-group.repository.impl';

const mockRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('UserGroupRepositoryImpl', () => {
  let repository: UserGroupRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupRepositoryImpl,
        { provide: getRepositoryToken(UserGroupEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<UserGroupRepositoryImpl>(UserGroupRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('returns group when found', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'group-1', ownerId: 'user-1' });
      const result = await repository.findById('group-1');
      expect(result).toMatchObject({ id: 'group-1' });
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findByOwner', () => {
    it('returns all groups for owner', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);
      const result = await repository.findByOwner('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('save', () => {
    it('creates entity and saves it', async () => {
      const group = { name: 'Trip', ownerId: 'user-1' };
      mockRepo.create.mockReturnValue(group);
      mockRepo.save.mockResolvedValue({ id: 'group-1', ...group });
      const result = await repository.save(group as never);
      expect(mockRepo.create).toHaveBeenCalledWith(group);
      expect(result).toMatchObject({ id: 'group-1' });
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to current date', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('group-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'group-1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });
});
