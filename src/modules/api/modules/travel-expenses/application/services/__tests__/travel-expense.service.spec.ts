import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { GroupMemberEntity } from '../../../../groups/infrastructure/database/entities/group-member.entity';
import { TravelExpenseService } from '../travel-expense.service';

const mockExpenseRepo = {
  findByGroup: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};
const mockAssignmentRepo = {
  findByExpense: jest.fn(),
  findByExpenseAndUser: jest.fn(),
  deleteByExpense: jest.fn(),
  saveMany: jest.fn(),
  settle: jest.fn(),
};
const mockMemberRepo = { findOne: jest.fn(), find: jest.fn() };
const mockManager = { create: jest.fn(), save: jest.fn() };
const mockDataSource = { transaction: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const makeExpense = (overrides = {}) => ({
  id: 'exp-1',
  groupId: 'group-1',
  paidBy: 'user-1',
  description: 'Cena',
  amount: 1000,
  splitType: 'EQUAL' as const,
  ...overrides,
});

const makeMember = (overrides = {}) => ({
  id: 'member-1',
  groupId: 'group-1',
  userId: 'user-1',
  role: 'OWNER',
  isActive: true,
  nulledAt: null,
  ...overrides,
});

describe('TravelExpenseService', () => {
  let service: TravelExpenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelExpenseService,
        { provide: 'TravelExpenseRepository', useValue: mockExpenseRepo },
        { provide: 'TravelExpenseAssignmentRepository', useValue: mockAssignmentRepo },
        { provide: getRepositoryToken(GroupMemberEntity), useValue: mockMemberRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<TravelExpenseService>(TravelExpenseService);
    jest.clearAllMocks();
    mockDataSource.transaction.mockImplementation((cb: (m: typeof mockManager) => unknown) =>
      cb(mockManager),
    );
  });

  // ─── createExpense ─────────────────────────────────────────────────────────
  describe('createExpense', () => {
    const baseDto = {
      groupId: 'group-1',
      description: 'Cena',
      amount: 1000,
      expenseDate: '2026-06-01',
      splitType: 'EQUAL' as const,
    };

    it('throws ForbiddenException when user is not a member of the group', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);
      await expect(service.createExpense('user-1', baseDto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when CUSTOM split has no assignments', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      await expect(
        service.createExpense('user-1', { ...baseDto, splitType: 'CUSTOM' as const }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when PERCENTAGE split has no assignments', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      await expect(
        service.createExpense('user-1', { ...baseDto, splitType: 'PERCENTAGE' as const }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when CUSTOM assignment missing assignedAmount', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      await expect(
        service.createExpense('user-1', {
          ...baseDto,
          splitType: 'CUSTOM' as const,
          assignments: [{ userId: 'user-2' }] as never,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when PERCENTAGE assignments do not sum to 100', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      await expect(
        service.createExpense('user-1', {
          ...baseDto,
          splitType: 'PERCENTAGE' as const,
          assignments: [
            { userId: 'user-1', percentage: 60 },
            { userId: 'user-2', percentage: 30 },
          ] as never,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when EQUAL split group has no active members', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockMemberRepo.find.mockResolvedValue([]);
      mockManager.create.mockReturnValueOnce({ groupId: 'group-1' });
      mockManager.save.mockResolvedValueOnce({ id: 'exp-1', amount: '1000' });
      await expect(service.createExpense('user-1', baseDto)).rejects.toThrow(BadRequestException);
    });

    it('creates EQUAL split expense with assignments per member', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockMemberRepo.find.mockResolvedValue([
        makeMember(),
        makeMember({ id: 'member-2', userId: 'user-2' }),
      ]);
      mockManager.create
        .mockReturnValueOnce({ groupId: 'group-1', amount: '1000' })
        .mockReturnValueOnce([
          { expenseId: 'exp-1', assignedAmount: '500' },
          { expenseId: 'exp-1', assignedAmount: '500' },
        ]);
      mockManager.save
        .mockResolvedValueOnce({ id: 'exp-1', amount: '1000' })
        .mockResolvedValueOnce([
          { id: 'assign-1', assignedAmount: '500' },
          { id: 'assign-2', assignedAmount: '500' },
        ]);

      const result = await service.createExpense('user-1', baseDto);
      expect(result.assignments).toHaveLength(2);
    });

    it('creates PERCENTAGE split expense calculating amounts from percentages', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockManager.create
        .mockReturnValueOnce({ groupId: 'group-1', amount: '1000' })
        .mockReturnValueOnce([{ expenseId: 'exp-1', assignedAmount: '600' }]);
      mockManager.save
        .mockResolvedValueOnce({ id: 'exp-1', amount: '1000' })
        .mockResolvedValueOnce([{ id: 'assign-1', assignedAmount: '600' }]);

      const result = await service.createExpense('user-1', {
        ...baseDto,
        splitType: 'PERCENTAGE' as const,
        assignments: [
          { userId: 'user-1', percentage: 60 },
          { userId: 'user-2', percentage: 40 },
        ] as never,
      });
      expect(result.assignments).toHaveLength(1);
    });

    it('creates CUSTOM split expense with provided amounts', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockManager.create
        .mockReturnValueOnce({ groupId: 'group-1' })
        .mockReturnValueOnce([{ expenseId: 'exp-1', assignedAmount: '700' }]);
      mockManager.save
        .mockResolvedValueOnce({ id: 'exp-1', amount: '1000' })
        .mockResolvedValueOnce([{ id: 'assign-1', assignedAmount: '700' }]);

      const result = await service.createExpense('user-1', {
        ...baseDto,
        splitType: 'CUSTOM' as const,
        assignments: [{ userId: 'user-2', assignedAmount: 700 }] as never,
      });
      expect(result.assignments).toHaveLength(1);
    });
  });

  // ─── getByGroup ────────────────────────────────────────────────────────────
  describe('getByGroup', () => {
    it('throws ForbiddenException when user is not a member', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);
      await expect(service.getByGroup('group-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('returns expenses with their assignments', async () => {
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockExpenseRepo.findByGroup.mockResolvedValue([makeExpense()]);
      mockAssignmentRepo.findByExpense.mockResolvedValue([{ id: 'assign-1' }]);

      const result = await service.getByGroup('group-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].assignments).toHaveLength(1);
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(service.getById('exp-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not a member of the group', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockMemberRepo.findOne.mockResolvedValue(null);
      await expect(service.getById('exp-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('returns expense with assignments', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockAssignmentRepo.findByExpense.mockResolvedValue([{ id: 'assign-1' }]);

      const result = await service.getById('exp-1', 'user-1');
      expect(result.id).toBe('exp-1');
      expect(result.assignments).toHaveLength(1);
    });
  });

  // ─── updateExpense ─────────────────────────────────────────────────────────
  describe('updateExpense', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(service.updateExpense('exp-1', 'user-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the creator', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ paidBy: 'other-user' }));
      await expect(
        service.updateExpense('exp-1', 'user-1', { description: 'Nuevo' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates and returns the expense', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockExpenseRepo.update.mockResolvedValue(undefined);
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockAssignmentRepo.findByExpense.mockResolvedValue([]);

      const result = await service.updateExpense('exp-1', 'user-1', { description: 'Cena nueva' });
      expect(mockExpenseRepo.update).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('recalculates EQUAL split assignments when amount changes', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockExpenseRepo.update.mockResolvedValue(undefined);
      mockMemberRepo.find.mockResolvedValue([
        makeMember(),
        makeMember({ id: 'member-2', userId: 'user-2' }),
      ]);
      mockAssignmentRepo.deleteByExpense.mockResolvedValue(undefined);
      mockAssignmentRepo.saveMany.mockResolvedValue(undefined);
      mockMemberRepo.findOne.mockResolvedValue(makeMember());
      mockAssignmentRepo.findByExpense.mockResolvedValue([]);

      await service.updateExpense('exp-1', 'user-1', { amount: 2000 });
      expect(mockAssignmentRepo.deleteByExpense).toHaveBeenCalledWith('exp-1');
      expect(mockAssignmentRepo.saveMany).toHaveBeenCalledTimes(1);
    });
  });

  // ─── deleteExpense ─────────────────────────────────────────────────────────
  describe('deleteExpense', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(service.deleteExpense('exp-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the creator', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense({ paidBy: 'other-user' }));
      await expect(service.deleteExpense('exp-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('soft deletes the expense', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockExpenseRepo.softDelete.mockResolvedValue(undefined);

      await service.deleteExpense('exp-1', 'user-1');
      expect(mockExpenseRepo.softDelete).toHaveBeenCalledWith('exp-1');
    });
  });

  // ─── settleAssignment ──────────────────────────────────────────────────────
  describe('settleAssignment', () => {
    it('throws NotFoundException when expense not found', async () => {
      mockExpenseRepo.findById.mockResolvedValue(null);
      await expect(
        service.settleAssignment('exp-1', 'user-1', { userId: 'user-2' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not OWNER or EDITOR', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ role: 'MEMBER' }));
      await expect(
        service.settleAssignment('exp-1', 'user-1', { userId: 'user-2' } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when assignment not found for user', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ role: 'OWNER' }));
      mockAssignmentRepo.findByExpenseAndUser.mockResolvedValue(null);
      await expect(
        service.settleAssignment('exp-1', 'user-1', { userId: 'user-2' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('settles the assignment and returns settled flag', async () => {
      mockExpenseRepo.findById.mockResolvedValue(makeExpense());
      mockMemberRepo.findOne.mockResolvedValue(makeMember({ role: 'OWNER' }));
      mockAssignmentRepo.findByExpenseAndUser.mockResolvedValue({
        id: 'assign-1',
        userId: 'user-2',
        assignedAmount: 500,
        settled: false,
      });
      mockAssignmentRepo.settle.mockResolvedValue(undefined);

      const result = await service.settleAssignment('exp-1', 'user-1', {
        userId: 'user-2',
      } as never);
      expect(mockAssignmentRepo.settle).toHaveBeenCalledWith('assign-1');
      expect(result.settled).toBe(true);
    });
  });
});
