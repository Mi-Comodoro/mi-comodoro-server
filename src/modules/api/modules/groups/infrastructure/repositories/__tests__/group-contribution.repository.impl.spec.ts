import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { GroupContributionEntity } from '../../database/entities/group-contribution.entity';
import { GroupContributionRepositoryImpl } from '../group-contribution.repository.impl';

const mockRepo = { find: jest.fn(), create: jest.fn(), save: jest.fn() };

describe('GroupContributionRepositoryImpl', () => {
  let repository: GroupContributionRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupContributionRepositoryImpl,
        { provide: getRepositoryToken(GroupContributionEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<GroupContributionRepositoryImpl>(GroupContributionRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findByGroup', () => {
    it('returns active contributions for a group ordered ASC', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      const result = await repository.findByGroup('group-1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no contributions', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await repository.findByGroup('group-1');
      expect(result).toEqual([]);
    });
  });

  describe('findByMember', () => {
    it('returns contributions for a specific member in a group', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'c1', userId: 'user-1' }]);
      const result = await repository.findByMember('group-1', 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('save', () => {
    it('creates entity and saves it', async () => {
      const contribution = { groupId: 'group-1', userId: 'user-1', amount: 1000 };
      mockRepo.create.mockReturnValue(contribution);
      mockRepo.save.mockResolvedValue({ id: 'c1', ...contribution });

      const result = await repository.save(contribution as never);

      expect(mockRepo.create).toHaveBeenCalledWith(contribution);
      expect(result).toMatchObject({ id: 'c1' });
    });
  });
});
