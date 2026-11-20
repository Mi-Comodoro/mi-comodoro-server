import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { GroupMemberEntity } from '../../database/entities/group-member.entity';
import { GroupMemberRepositoryImpl } from '../group-member.repository.impl';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('GroupMemberRepositoryImpl', () => {
  let repository: GroupMemberRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupMemberRepositoryImpl,
        { provide: getRepositoryToken(GroupMemberEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<GroupMemberRepositoryImpl>(GroupMemberRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findByGroup', () => {
    it('returns active members of a group', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
      const result = await repository.findByGroup('group-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findByUser', () => {
    it('returns groups where user is a member', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'm1', groupId: 'g1' }]);
      const result = await repository.findByUser('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns member when found', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'm1', groupId: 'g1', userId: 'user-1' });
      const result = await repository.findOne('g1', 'user-1');
      expect(result).toMatchObject({ id: 'm1' });
    });

    it('returns null when member not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findOne('g1', 'user-x');
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('creates entity and saves it', async () => {
      const member = { groupId: 'g1', userId: 'user-1', role: 'MEMBER' };
      mockRepo.create.mockReturnValue(member);
      mockRepo.save.mockResolvedValue({ id: 'm1', ...member });
      const result = await repository.save(member as never);
      expect(result).toMatchObject({ id: 'm1' });
    });
  });

  describe('softDelete', () => {
    it('sets nulledAt to mark member as deleted', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      await repository.softDelete('m1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({ nulledAt: expect.any(Date) }),
      );
    });
  });
});
