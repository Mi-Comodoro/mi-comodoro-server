import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { AccountsPayableService } from '@/modules/api/modules/accounts-payable/application/accounts-payable.service';
import { AccountsReceivableService } from '@/modules/api/modules/accounts-receivable/application/accounts-receivable.service';
import { BudgetService } from '@/modules/api/modules/budgets/application/budget.service';
import { NotificationsService } from '@/modules/api/modules/notifications/application/services/notifications.service';

import type { GroupContribution } from '../../domain/group-contribution';
import type { GroupExpense } from '../../domain/group-expense';
import type { GroupMember } from '../../domain/group-member';
import type { UserGroup } from '../../domain/user-group';
import { GroupsService } from '../groups.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGroupRepo = {
  findById: jest.fn(),
  findByOwner: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
};

const mockMemberRepo = {
  findByGroup: jest.fn(),
  findByUser: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
};

const mockExpenseRepo = {
  findByGroup: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
};

const mockContributionRepo = {
  findByGroup: jest.fn(),
  findByMember: jest.fn(),
  save: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockDataSource = {
  query: jest.fn(),
  manager: {
    save: jest.fn(),
  },
};

const mockArService = {
  create: jest.fn(),
  registerCollection: jest.fn(),
  setLinkedCxp: jest.fn(),
};

const mockApService = {
  create: jest.fn(),
  registerPayment: jest.fn(),
  setLinkedCxc: jest.fn(),
};

const mockBudgetService = {
  getDefaultBudget: jest.fn(),
};

const mockNotificationsService = {
  createNotification: jest.fn(),
};

// ─── Factories ────────────────────────────────────────────────────────────────

const makeGroup = (overrides: Partial<UserGroup> = {}): UserGroup => ({
  id: 'group-1',
  name: 'Viaje Cartagena',
  type: 'TRAVEL',
  ownerId: 'owner-1',
  status: 'Activo',
  maxMembers: 5,
  goal: 2_000_000,
  ...overrides,
});

const makeMember = (overrides: Partial<GroupMember> = {}): GroupMember => ({
  id: 'member-1',
  groupId: 'group-1',
  userId: 'owner-1',
  role: 'ORGANIZER',
  memberStatus: 'active',
  isActive: true,
  ...overrides,
});

const makeExpense = (overrides: Partial<GroupExpense> = {}): GroupExpense => ({
  id: 'expense-1',
  groupId: 'group-1',
  description: 'Vuelo',
  amount: 450_000,
  dueDate: new Date('2026-07-15'),
  responsibleUserId: 'user-2',
  status: 'planned',
  ...overrides,
});

const makeContribution = (overrides: Partial<GroupContribution> = {}): GroupContribution => ({
  id: 'contribution-1',
  groupId: 'group-1',
  userId: 'owner-1',
  amount: 100_000,
  budgetLabel: 'Julio 2026',
  ...overrides,
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('GroupsService', () => {
  let service: GroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: 'UserGroupRepository', useValue: mockGroupRepo },
        { provide: 'GroupMemberRepository', useValue: mockMemberRepo },
        { provide: 'GroupExpenseRepository', useValue: mockExpenseRepo },
        { provide: 'GroupContributionRepository', useValue: mockContributionRepo },
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AccountsReceivableService, useValue: mockArService },
        { provide: AccountsPayableService, useValue: mockApService },
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    jest.clearAllMocks();
  });

  // ─── createGroup ────────────────────────────────────────────────────────────

  describe('createGroup', () => {
    it('saves the group with status Activo and defaults maxMembers to 5', async () => {
      const group = makeGroup();
      const member = makeMember();
      mockGroupRepo.save.mockResolvedValue(group);
      mockMemberRepo.save.mockResolvedValue(member);

      const result = await service.createGroup('owner-1', {
        name: 'Viaje Cartagena',
        type: 'TRAVEL',
      });

      expect(mockGroupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Viaje Cartagena',
          type: 'TRAVEL',
          ownerId: 'owner-1',
          maxMembers: 5,
          status: 'Activo',
        }),
      );
      expect(result.members).toHaveLength(1);
      expect(result.members[0].role).toBe('ORGANIZER');
    });

    it('respects custom maxMembers from dto', async () => {
      mockGroupRepo.save.mockResolvedValue(makeGroup({ maxMembers: 10 }));
      mockMemberRepo.save.mockResolvedValue(makeMember());

      await service.createGroup('owner-1', { name: 'G', type: 'SHARED', maxMembers: 10 });

      expect(mockGroupRepo.save).toHaveBeenCalledWith(expect.objectContaining({ maxMembers: 10 }));
    });

    it('saves the creator as ORGANIZER member with active status', async () => {
      const group = makeGroup({ id: 'g-2' });
      mockGroupRepo.save.mockResolvedValue(group);
      mockMemberRepo.save.mockResolvedValue(makeMember({ groupId: 'g-2' }));

      await service.createGroup('owner-1', { name: 'G', type: 'FAMILIAR' });

      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'g-2',
          userId: 'owner-1',
          role: 'ORGANIZER',
          memberStatus: 'active',
          isActive: true,
        }),
      );
    });

    it('returns the spread group with members array', async () => {
      const group = makeGroup();
      const member = makeMember();
      mockGroupRepo.save.mockResolvedValue(group);
      mockMemberRepo.save.mockResolvedValue(member);

      const result = await service.createGroup('owner-1', { name: 'G', type: 'SHARED' });

      expect(result).toMatchObject({ id: 'group-1', name: 'Viaje Cartagena' });
      expect(result.members[0]).toBe(member);
    });
  });

  // ─── getGroups ──────────────────────────────────────────────────────────────

  describe('getGroups', () => {
    it('returns owned groups and member-only groups without duplicates', async () => {
      const owned = [makeGroup({ id: 'g-1' })];
      const memberships = [
        makeMember({ groupId: 'g-1' }), // duplicate — already owned
        makeMember({ groupId: 'g-2' }), // additional group
      ];
      const g2 = makeGroup({ id: 'g-2', ownerId: 'other-user' });

      mockGroupRepo.findByOwner.mockResolvedValue(owned);
      mockMemberRepo.findByUser.mockResolvedValue(memberships);
      mockGroupRepo.findById.mockResolvedValue(g2);

      const result = await service.getGroups('owner-1');

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.id)).toContain('g-1');
      expect(result.map((g) => g.id)).toContain('g-2');
      // findById should only be called for the non-owned group
      expect(mockGroupRepo.findById).toHaveBeenCalledTimes(1);
      expect(mockGroupRepo.findById).toHaveBeenCalledWith('g-2');
    });

    it('returns only owned groups when user has no other memberships', async () => {
      mockGroupRepo.findByOwner.mockResolvedValue([makeGroup()]);
      mockMemberRepo.findByUser.mockResolvedValue([]);

      const result = await service.getGroups('owner-1');

      expect(result).toHaveLength(1);
      expect(mockGroupRepo.findById).not.toHaveBeenCalled();
    });

    it('filters null results from findById for member groups', async () => {
      mockGroupRepo.findByOwner.mockResolvedValue([]);
      mockMemberRepo.findByUser.mockResolvedValue([makeMember({ groupId: 'deleted-group' })]);
      mockGroupRepo.findById.mockResolvedValue(null);

      const result = await service.getGroups('owner-1');

      expect(result).toHaveLength(0);
    });
  });

  // ─── getGroupById ────────────────────────────────────────────────────────────

  describe('getGroupById', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.getGroupById('group-1', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not owner and not a member', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'other' }));
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.getGroupById('group-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });

    it('returns the group with enriched members for the owner', async () => {
      const group = makeGroup();
      const members = [makeMember()];
      mockGroupRepo.findById.mockResolvedValue(group);
      // assertMembership: second call — owner branch returns early
      mockMemberRepo.findByGroup.mockResolvedValue(members);
      // getMemberProfiles via dataSource.query
      mockDataSource.query.mockResolvedValue([
        { id: 'owner-1', handle: 'owner_handle', display_name: 'Owner Name' },
      ]);

      const result = await service.getGroupById('group-1', 'owner-1');

      expect(result.id).toBe('group-1');
      expect(result.members).toHaveLength(1);
      expect(result.members[0]).toMatchObject({
        handle: 'owner_handle',
        displayName: 'Owner Name',
      });
    });

    it('returns the group with enriched members for a non-owner member', async () => {
      const group = makeGroup({ ownerId: 'owner-1' });
      const memberRecord = makeMember({ userId: 'user-2', role: 'MEMBER' });
      mockGroupRepo.findById.mockResolvedValue(group);
      // assertMembership will call findOne for user-2
      mockMemberRepo.findOne.mockResolvedValue(memberRecord);
      mockMemberRepo.findByGroup.mockResolvedValue([memberRecord]);
      mockDataSource.query.mockResolvedValue([
        { id: 'user-2', handle: 'user2_handle', display_name: 'User 2' },
      ]);

      const result = await service.getGroupById('group-1', 'user-2');

      expect(result.members[0]).toMatchObject({ handle: 'user2_handle' });
    });

    it('sets handle/displayName to null for members without a userId', async () => {
      const group = makeGroup();
      const externalMember = makeMember({ userId: null, externalName: 'Juan Externo' });
      mockGroupRepo.findById.mockResolvedValue(group);
      mockMemberRepo.findByGroup.mockResolvedValue([externalMember]);
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getGroupById('group-1', 'owner-1');

      expect(result.members[0].handle).toBeNull();
      expect(result.members[0].displayName).toBeNull();
    });
  });

  // ─── updateGroup ─────────────────────────────────────────────────────────────

  describe('updateGroup', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.updateGroup('group-1', 'owner-1', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));

      await expect(service.updateGroup('group-1', 'stranger', { name: 'New' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('saves and returns the updated group', async () => {
      const group = makeGroup();
      const updated = makeGroup({ name: 'Updated Name' });
      mockGroupRepo.findById.mockResolvedValue(group);
      mockGroupRepo.save.mockResolvedValue(updated);

      const result = await service.updateGroup('group-1', 'owner-1', { name: 'Updated Name' });

      expect(mockGroupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'group-1', name: 'Updated Name' }),
      );
      expect(result.name).toBe('Updated Name');
    });
  });

  // ─── deleteGroup ─────────────────────────────────────────────────────────────

  describe('deleteGroup', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.deleteGroup('group-1', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));

      await expect(service.deleteGroup('group-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });

    it('calls softDelete on the group when owner requests deletion', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());

      await service.deleteGroup('group-1', 'owner-1');

      expect(mockGroupRepo.softDelete).toHaveBeenCalledWith('group-1');
    });
  });

  // ─── addMember ───────────────────────────────────────────────────────────────

  describe('addMember', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.addMember('group-1', 'owner-1', { userId: 'user-2' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));

      await expect(service.addMember('group-1', 'stranger', { userId: 'user-2' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException when user is already a member', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ userId: 'user-2' }));

      await expect(service.addMember('group-1', 'owner-1', { userId: 'user-2' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('saves the member with role MEMBER by default', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(null);
      const newMember = makeMember({ userId: 'user-2', role: 'MEMBER' });
      mockMemberRepo.save.mockResolvedValue(newMember);

      const result = await service.addMember('group-1', 'owner-1', { userId: 'user-2' });

      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'group-1',
          userId: 'user-2',
          role: 'MEMBER',
          memberStatus: 'active',
          isActive: true,
        }),
      );
      expect(result.role).toBe('MEMBER');
    });

    it('saves with the provided role when specified in dto', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(null);
      mockMemberRepo.save.mockResolvedValue(makeMember({ role: 'CO_ORGANIZER' }));

      await service.addMember('group-1', 'owner-1', { userId: 'user-2', role: 'CO_ORGANIZER' });

      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'CO_ORGANIZER' }),
      );
    });
  });

  // ─── removeMember ────────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.removeMember('group-1', 'user-2', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when requester is neither the target user nor the owner', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));

      await expect(service.removeMember('group-1', 'user-2', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when member record does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.removeMember('group-1', 'user-2', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when member record has no id', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      const memberNoId = makeMember({ id: undefined });
      mockMemberRepo.findOne.mockResolvedValue(memberNoId);

      await expect(service.removeMember('group-1', 'user-2', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows a user to remove themselves from a group', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ id: 'member-1', userId: 'user-2' }));

      await service.removeMember('group-1', 'user-2', 'user-2');

      expect(mockMemberRepo.softDelete).toHaveBeenCalledWith('member-1');
    });

    it('allows the owner to remove another member', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ id: 'member-1', userId: 'user-2' }));

      await service.removeMember('group-1', 'user-2', 'owner-1');

      expect(mockMemberRepo.softDelete).toHaveBeenCalledWith('member-1');
    });
  });

  // ─── getContributions ────────────────────────────────────────────────────────

  describe('getContributions', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.getContributions('group-1', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException (via assertMembership) for non-members', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));
      // assertMembership: second findById call returns group, then findOne returns null
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.getContributions('group-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns summary with correct totals and percentages', async () => {
      const group = makeGroup({ goal: 1_000_000 });
      mockGroupRepo.findById.mockResolvedValue(group);
      // assertMembership: owner — no findOne needed
      const members = [
        makeMember({ userId: 'owner-1', role: 'ORGANIZER', memberStatus: 'active' }),
        makeMember({
          id: 'member-2',
          userId: 'user-2',
          role: 'MEMBER',
          memberStatus: 'active',
        }),
      ];
      mockMemberRepo.findByGroup.mockResolvedValue(members);
      const contributions = [
        makeContribution({ userId: 'owner-1', amount: 300_000 }),
        makeContribution({ userId: 'user-2', amount: 700_000 }),
      ];
      mockContributionRepo.findByGroup.mockResolvedValue(contributions);
      // getUserHandles
      mockDataSource.query.mockResolvedValue([
        { id: 'owner-1', handle: 'owner_h' },
        { id: 'user-2', handle: 'user2_h' },
      ]);

      const result = await service.getContributions('group-1', 'owner-1');

      expect(result.goal).toBe(1_000_000);
      expect(result.totalContributed).toBe(1_000_000);
      const ownerData = result.members.find((m) => m.userId === 'owner-1');
      const user2Data = result.members.find((m) => m.userId === 'user-2');
      expect(ownerData?.percentage).toBe(30);
      expect(user2Data?.percentage).toBe(70);
    });

    it('returns 0% for all members when total contributed is zero', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findByGroup.mockResolvedValue([makeMember()]);
      mockContributionRepo.findByGroup.mockResolvedValue([]);
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getContributions('group-1', 'owner-1');

      expect(result.totalContributed).toBe(0);
      expect(result.members[0].percentage).toBe(0);
    });

    it('returns null budgetLabel when member has no contributions', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findByGroup.mockResolvedValue([makeMember()]);
      mockContributionRepo.findByGroup.mockResolvedValue([]);
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getContributions('group-1', 'owner-1');

      expect(result.members[0].budgetLabel).toBeNull();
    });
  });

  // ─── getExpenses ─────────────────────────────────────────────────────────────

  describe('getExpenses', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.getExpenses('group-1', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException (via assertMembership) for non-members', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.getExpenses('group-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });

    it('returns expenses from repository for valid member', async () => {
      const expenses = [makeExpense(), makeExpense({ id: 'expense-2' })];
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockExpenseRepo.findByGroup.mockResolvedValue(expenses);

      const result = await service.getExpenses('group-1', 'owner-1');

      expect(result).toHaveLength(2);
      expect(mockExpenseRepo.findByGroup).toHaveBeenCalledWith('group-1');
    });
  });

  // ─── createExpense ───────────────────────────────────────────────────────────

  describe('createExpense', () => {
    const dto = {
      description: 'Vuelo',
      amount: 450_000,
      dueDate: '2026-07-15',
      responsibleUserId: 'user-2',
    };

    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.createExpense('group-1', 'owner-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when group is Cerrado', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ status: 'Cerrado' }));

      await expect(service.createExpense('group-1', 'owner-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException (via assertOrganizerRole) for a plain MEMBER', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));
      // assertOrganizerRole: second findById returns group, findOne returns plain member
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ userId: 'user-2', role: 'MEMBER' }));

      await expect(service.createExpense('group-1', 'user-2', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('saves and returns the expense when requester is the owner', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      const savedExpense = makeExpense();
      mockExpenseRepo.save.mockResolvedValue(savedExpense);

      const result = await service.createExpense('group-1', 'owner-1', dto);

      expect(mockExpenseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'group-1',
          description: 'Vuelo',
          amount: 450_000,
          status: 'planned',
        }),
      );
      expect(result.id).toBe('expense-1');
    });

    it('saves and returns the expense when requester is a CO_ORGANIZER', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ userId: 'co-org', role: 'CO_ORGANIZER' }),
      );
      mockExpenseRepo.save.mockResolvedValue(makeExpense());

      await service.createExpense('group-1', 'co-org', dto);

      expect(mockExpenseRepo.save).toHaveBeenCalled();
    });
  });

  // ─── updateExpense ───────────────────────────────────────────────────────────

  describe('updateExpense', () => {
    it('throws NotFoundException when expense does not exist', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateExpense('group-1', 'expense-1', 'owner-1', { description: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when expense belongs to a different group', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ groupId: 'other-group' }));

      await expect(
        service.updateExpense('group-1', 'expense-1', 'owner-1', { description: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when expense is not in planned status', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ status: 'paid' }));

      await expect(
        service.updateExpense('group-1', 'expense-1', 'owner-1', { description: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('calls update and returns the updated expense for owner', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      const updated = makeExpense({ description: 'New Desc' });
      mockExpenseRepo.update.mockResolvedValue(updated);

      const result = await service.updateExpense('group-1', 'expense-1', 'owner-1', {
        description: 'New Desc',
      });

      expect(mockExpenseRepo.update).toHaveBeenCalledWith(
        'expense-1',
        expect.objectContaining({ description: 'New Desc' }),
      );
      expect(result.description).toBe('New Desc');
    });

    it('does not include undefined fields in the update payload', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockExpenseRepo.update.mockResolvedValue(makeExpense());

      await service.updateExpense('group-1', 'expense-1', 'owner-1', {});

      expect(mockExpenseRepo.update).toHaveBeenCalledWith('expense-1', {});
    });
  });

  // ─── payExpense ───────────────────────────────────────────────────────────────

  describe('payExpense', () => {
    it('throws NotFoundException when expense does not exist', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);

      await expect(service.payExpense('group-1', 'expense-1', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when expense belongs to a different group', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ groupId: 'other-group' }));

      await expect(service.payExpense('group-1', 'expense-1', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('calls updateStatus with paid and returns the result (happy path — owner)', async () => {
      const expense = makeExpense({ cxcId: null, cxpId: null });
      mockExpenseRepo.findById.mockResolvedValue(expense);
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockBudgetService.getDefaultBudget.mockResolvedValue(null);
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'paid' }));

      const result = await service.payExpense('group-1', 'expense-1', 'owner-1');

      expect(mockExpenseRepo.updateStatus).toHaveBeenCalledWith('expense-1', 'paid');
      expect(result.status).toBe('paid');
    });

    it('registers CxC collection when expense has cxcId', async () => {
      const expense = makeExpense({ cxcId: 'cxc-1', cxpId: null });
      mockExpenseRepo.findById.mockResolvedValue(expense);
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockBudgetService.getDefaultBudget.mockResolvedValue(null);
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'paid' }));

      await service.payExpense('group-1', 'expense-1', 'owner-1');

      expect(mockArService.registerCollection).toHaveBeenCalledWith(
        'cxc-1',
        'owner-1',
        expect.objectContaining({ amount: 450_000 }),
      );
    });

    it('swallows CxC registration errors and continues', async () => {
      const expense = makeExpense({ cxcId: 'cxc-1' });
      mockExpenseRepo.findById.mockResolvedValue(expense);
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockArService.registerCollection.mockRejectedValue(new Error('Network error'));
      mockBudgetService.getDefaultBudget.mockResolvedValue(null);
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'paid' }));

      await expect(service.payExpense('group-1', 'expense-1', 'owner-1')).resolves.not.toThrow();
      expect(mockExpenseRepo.updateStatus).toHaveBeenCalled();
    });

    it('saves payer budget transaction when payerBudget exists', async () => {
      const expense = makeExpense({ cxcId: null, cxpId: null, responsibleUserId: 'user-2' });
      mockExpenseRepo.findById.mockResolvedValue(expense);
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockBudgetService.getDefaultBudget
        .mockResolvedValueOnce({ id: 'budget-payer' })
        .mockResolvedValueOnce(null);
      mockDataSource.manager.save.mockResolvedValue({});
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'paid' }));

      await service.payExpense('group-1', 'expense-1', 'owner-1');

      expect(mockDataSource.manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'expense', userId: 'user-2', budgetId: 'budget-payer' }),
      );
    });

    it('saves organizer income transaction when organizer budget exists and requester differs from responsible', async () => {
      const expense = makeExpense({ cxcId: null, cxpId: null, responsibleUserId: 'user-2' });
      mockExpenseRepo.findById.mockResolvedValue(expense);
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockBudgetService.getDefaultBudget
        .mockResolvedValueOnce(null) // payer budget
        .mockResolvedValueOnce({ id: 'budget-organizer' }); // organizer budget
      mockDataSource.manager.save.mockResolvedValue({});
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'paid' }));

      await service.payExpense('group-1', 'expense-1', 'owner-1');

      expect(mockDataSource.manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'income',
          userId: 'owner-1',
          budgetId: 'budget-organizer',
        }),
      );
    });

    it('does not save organizer income when requester is the responsible user', async () => {
      const expense = makeExpense({ responsibleUserId: 'owner-1', cxcId: null, cxpId: null });
      mockExpenseRepo.findById.mockResolvedValue(expense);
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockBudgetService.getDefaultBudget.mockResolvedValue({ id: 'budget-1' });
      mockDataSource.manager.save.mockResolvedValue({});
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'paid' }));

      await service.payExpense('group-1', 'expense-1', 'owner-1');

      // Only the payer expense transaction — no income entry
      const saveCalls = mockDataSource.manager.save.mock.calls;
      const incomeCall = saveCalls.find((c) => (c[1] as Record<string, unknown>).type === 'income');
      expect(incomeCall).toBeUndefined();
    });
  });

  // ─── markExpenseCxp ──────────────────────────────────────────────────────────

  describe('markExpenseCxp', () => {
    it('throws NotFoundException when expense does not exist', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);

      await expect(service.markExpenseCxp('group-1', 'expense-1', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when expense belongs to a different group', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ groupId: 'other-group' }));

      await expect(service.markExpenseCxp('group-1', 'expense-1', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates CxC, CxP, links them and updates status to cxp (happy path)', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      // getMemberProfiles
      mockDataSource.query.mockResolvedValue([
        { id: 'user-2', handle: 'user2_h', display_name: 'User 2' },
      ]);
      const cxc = { id: 'cxc-1' };
      const cxp = { id: 'cxp-1' };
      mockArService.create.mockResolvedValue(cxc);
      mockApService.create.mockResolvedValue(cxp);
      mockArService.setLinkedCxp.mockResolvedValue(undefined);
      mockApService.setLinkedCxc.mockResolvedValue(undefined);
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'cxp' }));

      const result = await service.markExpenseCxp('group-1', 'expense-1', 'owner-1');

      expect(mockArService.create).toHaveBeenCalledWith(
        'owner-1',
        expect.objectContaining({ name: 'Vuelo', originalAmount: 450_000 }),
      );
      expect(mockApService.create).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({ name: 'Vuelo', originalAmount: 450_000 }),
      );
      expect(mockArService.setLinkedCxp).toHaveBeenCalledWith('cxc-1', 'cxp-1');
      expect(mockApService.setLinkedCxc).toHaveBeenCalledWith('cxp-1', 'cxc-1');
      expect(mockExpenseRepo.updateStatus).toHaveBeenCalledWith('expense-1', 'cxp', {
        cxcId: 'cxc-1',
        cxpId: 'cxp-1',
      });
      expect(result.status).toBe('cxp');
    });

    it('uses displayName when responsible user has no handle', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockDataSource.query.mockResolvedValue([
        { id: 'user-2', handle: null, display_name: 'Juan Perez' },
      ]);
      mockArService.create.mockResolvedValue({ id: 'cxc-1' });
      mockApService.create.mockResolvedValue({ id: 'cxp-1' });
      mockArService.setLinkedCxp.mockResolvedValue(undefined);
      mockApService.setLinkedCxc.mockResolvedValue(undefined);
      mockExpenseRepo.updateStatus.mockResolvedValue(makeExpense({ status: 'cxp' }));

      await service.markExpenseCxp('group-1', 'expense-1', 'owner-1');

      expect(mockArService.create).toHaveBeenCalledWith(
        'owner-1',
        expect.objectContaining({ debtor: 'Juan Perez' }),
      );
    });
  });

  // ─── getGroupBudgetProgress ──────────────────────────────────────────────────

  describe('getGroupBudgetProgress', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(service.getGroupBudgetProgress('group-1', 'owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException (via assertMembership) for non-members', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.getGroupBudgetProgress('group-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns budget progress with totalLinked and totalPaid calculated correctly', async () => {
      const group = makeGroup({ goal: 500_000 });
      mockGroupRepo.findById.mockResolvedValue(group);
      // assertMembership passes for owner
      mockDataSource.query.mockResolvedValue([
        {
          id: 'ep-1',
          name: 'Vuelo',
          expected_amount: '300000',
          status: 'PAID',
          budget_id: 'budget-1',
          user_id: 'owner-1',
        },
        {
          id: 'ep-2',
          name: 'Hotel',
          expected_amount: '200000',
          status: 'PLANNED',
          budget_id: 'budget-2',
          user_id: 'user-2',
        },
      ]);

      const result = await service.getGroupBudgetProgress('group-1', 'owner-1');

      expect(result.goal).toBe(500_000);
      expect(result.totalLinked).toBe(500_000);
      expect(result.totalPaid).toBe(300_000);
      expect(result.expenses).toHaveLength(2);
      expect(result.expenses[0]).toMatchObject({
        id: 'ep-1',
        name: 'Vuelo',
        expectedAmount: 300_000,
        status: 'PAID',
      });
    });

    it('returns zero totals when no expenses are linked', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ goal: null }));
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getGroupBudgetProgress('group-1', 'owner-1');

      expect(result.goal).toBeNull();
      expect(result.totalLinked).toBe(0);
      expect(result.totalPaid).toBe(0);
    });
  });

  // ─── inviteWithContext ────────────────────────────────────────────────────────

  describe('inviteWithContext', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(
        service.inviteWithContext('group-1', 'owner-1', { userId: 'user-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the owner', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ ownerId: 'owner-1' }));

      await expect(
        service.inviteWithContext('group-1', 'stranger', { userId: 'user-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when user is already a member', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ userId: 'user-2' }));

      await expect(
        service.inviteWithContext('group-1', 'owner-1', { userId: 'user-2' }),
      ).rejects.toThrow(ConflictException);
    });

    it('saves member with invited status and role MEMBER by default', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(null);
      const invitedMember = makeMember({
        userId: 'user-2',
        memberStatus: 'invited',
        isActive: false,
      });
      mockMemberRepo.save.mockResolvedValue(invitedMember);
      mockDataSource.query.mockResolvedValue([]); // getMemberProfiles
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.inviteWithContext('group-1', 'owner-1', { userId: 'user-2' });

      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'group-1',
          userId: 'user-2',
          role: 'MEMBER',
          memberStatus: 'invited',
          isActive: false,
        }),
      );
      expect(result.memberStatus).toBe('invited');
    });

    it('saves member with a custom role when provided', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(null);
      mockMemberRepo.save.mockResolvedValue(
        makeMember({ role: 'CO_ORGANIZER', memberStatus: 'invited' }),
      );
      mockDataSource.query.mockResolvedValue([]);
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      await service.inviteWithContext('group-1', 'owner-1', {
        userId: 'user-2',
        role: 'CO_ORGANIZER',
      });

      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'CO_ORGANIZER' }),
      );
    });

    it('swallows notification errors and still returns the saved member', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(null);
      const member = makeMember({ memberStatus: 'invited' });
      mockMemberRepo.save.mockResolvedValue(member);
      mockDataSource.query.mockResolvedValue([]);
      mockNotificationsService.createNotification.mockRejectedValue(new Error('Notification fail'));

      await expect(
        service.inviteWithContext('group-1', 'owner-1', { userId: 'user-2' }),
      ).resolves.toBe(member);
    });
  });

  // ─── respondToInvitation ──────────────────────────────────────────────────────

  describe('respondToInvitation', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockGroupRepo.findById.mockResolvedValue(null);

      await expect(
        service.respondToInvitation('group-1', 'user-2', { action: 'decline' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no pending invitation exists for responder', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.respondToInvitation('group-1', 'user-2', { action: 'decline' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when member has an invalid status', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      // status 'external' is not 'invited' or 'active'
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ memberStatus: 'external' as never }));

      await expect(
        service.respondToInvitation('group-1', 'user-2', { action: 'decline' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when member record has no id', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: undefined, memberStatus: 'invited' }),
      );

      await expect(
        service.respondToInvitation('group-1', 'user-2', { action: 'decline' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes the member and returns accepted=false on decline', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: 'member-1', memberStatus: 'invited' }),
      );

      const result = await service.respondToInvitation('group-1', 'user-2', { action: 'decline' });

      expect(mockMemberRepo.softDelete).toHaveBeenCalledWith('member-1');
      expect(result).toEqual({ accepted: false });
    });

    it('activates membership via SQL and returns accepted=true on accept_no_budget', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: 'member-1', memberStatus: 'invited' }),
      );
      // First query: activate membership. Second: getMemberProfiles
      mockDataSource.query
        .mockResolvedValueOnce(undefined) // UPDATE group_members
        .mockResolvedValueOnce([]); // getMemberProfiles
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.respondToInvitation('group-1', 'user-2', {
        action: 'accept_no_budget',
      });

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("member_status = 'active'"),
        ['member-1'],
      );
      expect(result.accepted).toBe(true);
      expect(result.expense).toBeUndefined();
    });

    it('does not re-activate membership when member is already active (idempotent)', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: 'member-1', memberStatus: 'active' }),
      );
      // No activation query needed — only getMemberProfiles
      mockDataSource.query.mockResolvedValue([]);
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      await service.respondToInvitation('group-1', 'user-2', { action: 'accept_no_budget' });

      // The UPDATE query should not be called because status is already active
      const updateCall = mockDataSource.query.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' && (c[0] as string).includes("member_status = 'active'"),
      );
      expect(updateCall).toBeUndefined();
    });

    it('creates a planned expense on accept_full when organizerAmount > 0 and budget exists', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ name: 'Viaje Cartagena' }));
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: 'member-1', memberStatus: 'invited' }),
      );
      mockDataSource.query
        .mockResolvedValueOnce(undefined) // UPDATE group_members
        .mockResolvedValueOnce([{ payload: { organizerPlannedAmount: 500_000 } }]) // invitation notification
        .mockResolvedValueOnce([]) // categories
        .mockResolvedValueOnce([{ id: 'new-expense-id' }]) // INSERT expenses_planned
        .mockResolvedValueOnce([]); // getMemberProfiles
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.respondToInvitation('group-1', 'user-2', {
        action: 'accept_full',
        budgetId: 'budget-2',
      });

      expect(result.accepted).toBe(true);
      expect(result.expense).toMatchObject({
        id: 'new-expense-id',
        name: 'Viaje: Viaje Cartagena',
        expectedAmount: 500_000,
      });
    });

    it('creates an expense with half the organizer amount on accept_half', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup({ name: 'Viaje Cartagena' }));
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: 'member-1', memberStatus: 'invited' }),
      );
      mockDataSource.query
        .mockResolvedValueOnce(undefined) // UPDATE group_members
        .mockResolvedValueOnce([{ payload: { organizerPlannedAmount: 400_000 } }]) // notification
        .mockResolvedValueOnce([]) // categories
        .mockResolvedValueOnce([{ id: 'half-expense-id' }]) // INSERT
        .mockResolvedValueOnce([]); // getMemberProfiles
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.respondToInvitation('group-1', 'user-2', {
        action: 'accept_half',
        budgetId: 'budget-2',
      });

      expect(result.expense).toMatchObject({ expectedAmount: 200_000 });
    });

    it('returns accepted=true without expense when no budget is found for accept_full', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: 'member-1', memberStatus: 'invited' }),
      );
      mockDataSource.query
        .mockResolvedValueOnce(undefined) // UPDATE group_members
        .mockResolvedValueOnce([{ payload: { organizerPlannedAmount: 200_000 } }]) // notification
        .mockResolvedValueOnce([]) // budgets (no budget found)
        .mockResolvedValueOnce([]); // getMemberProfiles
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.respondToInvitation('group-1', 'user-2', {
        action: 'accept_full',
      });

      expect(result.accepted).toBe(true);
      expect(result.expense).toBeUndefined();
    });

    it('swallows notification errors and still returns accepted=true', async () => {
      mockGroupRepo.findById.mockResolvedValue(makeGroup());
      mockMemberRepo.findOne.mockResolvedValue(
        makeMember({ id: 'member-1', memberStatus: 'invited' }),
      );
      mockDataSource.query.mockResolvedValue([]);
      mockNotificationsService.createNotification.mockRejectedValue(new Error('Push failed'));

      const result = await service.respondToInvitation('group-1', 'user-2', {
        action: 'accept_no_budget',
      });

      expect(result.accepted).toBe(true);
    });
  });
});
